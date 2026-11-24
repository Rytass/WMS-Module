import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from 'pg';
import { DataSource, type DeepPartial } from 'typeorm';
import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import {
  AllocateInventoryOrderService,
  BatchService,
  ConsumptionOrderService,
  HoldInventoryOrderService,
  InventoryCountOrderService,
  LoaderService,
  LocationEntityClass,
  MaterialService,
  MaterialUnitEntityClass,
  MergeBatchOrderService,
  ReceiveInventoryOrderItemEntityClass,
  ReceiveInventoryOrderService,
  ScrapeService,
  ShipInventoryOrderItemEntityClass,
  ShipInventoryOrderService,
  SplitBatchOrderService,
  StockEntityClass,
  StockService,
  StockStatus,
  TransferCustomerOrderService,
  TransferOrderItemEntityClass,
  TransferOrderService,
  TransferVendorOrderService,
  WmsEntities,
  WmsModuleCoreModule,
} from '@rytass/wms-module-core';

/**
 * #227: quantities are `numeric` in the database but were added, multiplied and
 * compared as JavaScript floats. Two reproductions from the issue, then one
 * 0.1-grain case per write service.
 *
 * The per-service cases all use a unit whose factor is 3, so a line of `0.1`
 * is `0.1 * 3` base units: `0.30000000000000004` as a float, exactly `0.3` as a
 * decimal. The shelf holds `0.3`, so before the fix every deduction was refused
 * as "insufficient" and every addition stored a value with a float tail.
 *
 * Requires a reachable PostgreSQL; override with WMS_TEST_DB_* env vars.
 */
const DB_HOST = process.env['WMS_TEST_DB_HOST'] ?? 'localhost';
const DB_PORT = Number(process.env['WMS_TEST_DB_PORT'] ?? 5432);
const DB_USER =
  process.env['WMS_TEST_DB_USER'] ?? process.env['USER'] ?? 'postgres';
const DB_PASS = process.env['WMS_TEST_DB_PASS'];
const DB_NAME =
  process.env['WMS_TEST_DECIMAL_DB_NAME'] ?? 'wms_module_decimal_test';

/** Drop the test database and, unless `recreate` is false, create it empty. */
const resetDatabase = async (recreate = true): Promise<void> => {
  const client = new Client({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASS,
    database: 'postgres',
  });

  await client.connect();

  try {
    await client.query(`DROP DATABASE IF EXISTS "${DB_NAME}" WITH (FORCE)`);
    if (recreate) await client.query(`CREATE DATABASE "${DB_NAME}"`);
  } finally {
    await client.end();
  }
};

type TransferItemInput = Parameters<
  TransferOrderService['createTransferOrder']
>[0]['items'][number];

describe('decimal quantities (#227)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let entities: WmsEntities;
  let stockService: StockService;
  let batchService: BatchService;
  let transferService: TransferOrderService;
  let receiveService: ReceiveInventoryOrderService;
  let shipService: ShipInventoryOrderService;
  let loaderService: LoaderService;

  let shelfId: string;
  let dockId: string;
  let benchId: string;
  let palletTypeId: string;

  let sequence = 0;
  const unique = (label: string): string => `${label}-${(sequence += 1)}`;

  const newMaterial = async (): Promise<{
    id: string;
    key: string;
    tenthUnitId: string;
  }> => {
    const key = unique('DEC-MAT');
    const material = await app.get(MaterialService).createMaterial({
      key,
      description: 'decimal quantities',
      baseUnit: 'EA',
      units: [{ unit: 'TENTH', conversionFactor: 3 }],
    });
    const unit = await dataSource
      .getRepository<MaterialUnitEntityClass>(MaterialUnitEntityClass)
      .findOneByOrFail({ materialId: material.id, unit: 'TENTH' });

    return { id: material.id, key, tenthUnitId: unit.id };
  };

  const newLocation = async (key: string): Promise<string> => {
    const repository = dataSource.getRepository<LocationEntityClass>(
      entities.location,
    );

    return (
      await repository.save(
        repository.create({
          key,
          description: key,
          isActive: true,
        } as DeepPartial<LocationEntityClass>),
      )
    ).id;
  };

  const seedStock = async (
    materialId: string,
    quantity: number,
    {
      locationId = shelfId,
      loaderId,
    }: { locationId?: string; loaderId?: string } = {},
  ): Promise<{ batchId: string }> => {
    const batch = await batchService.getBatch({
      key: unique('DEC-BATCH'),
      materialId,
    });
    const orderRepository = dataSource.getRepository<OrderEntity>(
      entities.order,
    );
    const base = await orderRepository.save(orderRepository.create({}));

    await dataSource.getRepository<StockEntityClass>(entities.stock).save({
      orderId: base.id,
      materialId,
      batchId: batch.id,
      locationId,
      loaderId: stockService.resolveLoaderId(loaderId),
      quantity,
    } as DeepPartial<StockEntityClass>);

    return { batchId: batch.id };
  };

  /** The whole ledger of a material, as a float8 prints it (numeric would pad 0 to 0.0). */
  const totalText = async (materialId: string): Promise<string> => {
    const [row] = await dataSource.query<[{ total: string }]>(
      `SELECT COALESCE(SUM(quantity), 0)::float8::text AS total FROM "${dataSource.getMetadata(entities.stock).tablePath}" WHERE "materialId" = $1`,
      [materialId],
    );

    return row.total;
  };

  const createShip = async (
    materialId: string,
    batchId: string,
    quantity: number,
    unitId?: string,
  ): Promise<{ itemId: string }> =>
    dataSource.transaction(async (manager) => {
      const order = await shipService.createShipInventoryOrder({
        key: unique('DEC-SHIP'),
        description: 'decimal ship',
        references: [],
        manager,
      });

      await shipService.addShipInventoryOrderItems(
        {
          orderId: order.id,
          items: [
            {
              materialId,
              batchId,
              locationId: shelfId,
              unitId,
              targetShippedQuantity: quantity,
              status: StockStatus.FREE,
              serialId: unique('DEC-SHIP-LINE'),
              orderId: order.id,
            },
          ],
        },
        manager,
      );

      const [item] = await manager
        .getRepository<ShipInventoryOrderItemEntityClass>(
          shipService.shipInventoryOrderItemEntity,
        )
        .find({ where: { orderId: order.id } });

      return { itemId: item.id };
    });

  const createTransfer = async (
    materialId: string,
    batchId: string,
    quantity: number,
    unitId?: string,
  ): Promise<{ itemId: string }> => {
    const order = await transferService.createTransferOrder({
      locationId: dockId,
      items: [
        {
          locationId: shelfId,
          materialId,
          batchId,
          unitId,
          targetTransferredQuantity: quantity,
        } as TransferItemInput,
      ],
    });
    const [item] = await dataSource
      .getRepository<TransferOrderItemEntityClass>(
        transferService.transferOrderItemEntity,
      )
      .find({ where: { orderId: order.id } });

    return { itemId: item.id };
  };

  beforeAll(async () => {
    await resetDatabase();

    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: DB_HOST,
          port: DB_PORT,
          username: DB_USER,
          password: DB_PASS,
          database: DB_NAME,
          autoLoadEntities: true,
          synchronize: true,
          uuidExtension: 'uuid-ossp',
        }),
        WmsModuleCoreModule.forRootAsync({
          useFactory: async () => ({}),
          defaultLoaderSerialId: 'DEFAULT',
          defaultLoaderTypeKey: 'DEFAULT',
          defaultLocationKey: 'DEFAULT',
        }),
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    dataSource = app.get(DataSource);
    entities = app.get(WmsEntities);
    stockService = app.get(StockService);
    batchService = app.get(BatchService);
    transferService = app.get(TransferOrderService);
    receiveService = app.get(ReceiveInventoryOrderService);
    shipService = app.get(ShipInventoryOrderService);
    loaderService = app.get(LoaderService);

    shelfId = await newLocation('DEC-SHELF');
    dockId = await newLocation('DEC-DOCK');
    benchId = await newLocation('DEC-BENCH');
    palletTypeId = (
      await loaderService.createLoaderType({
        key: 'DECP',
        description: 'pallet',
      })
    ).id;
  });

  afterAll(async () => {
    await app?.close();
    await resetDatabase(false);
  });

  describe('reproductions from the issue', () => {
    it('three shipments of 0.1 against a reservation of 0.3', async () => {
      const material = await newMaterial();
      const { batchId } = await seedStock(material.id, 1);
      const { itemId } = await createShip(material.id, batchId, 0.3);

      await shipService.ship({ itemId, quantity: 0.1 });
      await shipService.ship({ itemId, quantity: 0.1 });
      await shipService.ship({ itemId, quantity: 0.1 });

      expect(await totalText(material.id)).toBe('0.7');
    });

    /*
     * The loader's total is summed from rows the database returns in no
     * particular order, so a single permutation can agree with it by luck.
     * Seven values and six permutations (each on its own loader) cannot.
     */
    const values = [0.1, 0.7, 0.3, 0.9, 0.2, 0.6, 0.4];
    const permutations: readonly (readonly number[])[] = [
      values,
      [...values].reverse(),
      [...values].sort((a, b) => a - b),
      [...values].sort((a, b) => b - a),
      [...values.slice(3), ...values.slice(0, 3)],
      [...values.slice(5), ...values.slice(0, 5)],
    ];

    it.each(permutations.map((order) => [order.join(', '), order] as const))(
      'a whole-loader transfer of %s is accepted whatever the item order',
      async (_name, quantities) => {
        const material = await newMaterial();
        const [loader] = await loaderService.createLoader({
          typeId: palletTypeId,
          locationId: shelfId,
          quantity: 1,
        });
        const batchOf = new Map<number, string>();

        for (const quantity of values) {
          const { batchId } = await seedStock(material.id, quantity, {
            loaderId: loader.id,
          });

          batchOf.set(quantity, batchId);
        }

        await expect(
          transferService.createTransferOrder({
            locationId: dockId,
            loaderId: loader.id,
            items: quantities.map(
              (quantity) =>
                ({
                  materialId: material.id,
                  batchId: batchOf.get(quantity) as string,
                  locationId: shelfId,
                  loaderId: loader.id,
                  targetTransferredQuantity: quantity,
                }) as TransferItemInput,
            ),
          }),
        ).resolves.toBeDefined();
      },
    );
  });

  describe('a line of 0.1 in a unit of 3, on a shelf of 0.3', () => {
    const fixture = async (): Promise<{
      materialId: string;
      unitId: string;
      batchId: string;
    }> => {
      const material = await newMaterial();
      const { batchId } = await seedStock(material.id, 0.3);

      return {
        materialId: material.id,
        unitId: material.tenthUnitId,
        batchId,
      };
    };

    it('receive stores 0.3, not 0.30000000000000004', async () => {
      const material = await newMaterial();
      const order = await receiveService.createReceiveInventoryOrder({
        key: unique('DEC-RCV'),
        description: 'decimal receive',
        items: [
          {
            serialId: unique('DEC-RCV-LINE'),
            materialKey: material.key,
            batchKey: unique('DEC-RB'),
            locationKey: 'DEC-SHELF',
            unitId: material.tenthUnitId,
            targetReceivedQuantity: 0.1,
            requireInspection: false,
          },
        ],
      });
      const [item] = await dataSource
        .getRepository<ReceiveInventoryOrderItemEntityClass>(
          receiveService.receiveInventoryOrderItemEntity,
        )
        .find({ where: { orderId: order.id } });

      await receiveService.receive({ itemId: item.id, quantity: 0.1 });

      expect(await totalText(material.id)).toBe('0.3');
    });

    it('ship', async () => {
      const f = await fixture();
      const { itemId } = await createShip(
        f.materialId,
        f.batchId,
        0.1,
        f.unitId,
      );

      await shipService.ship({ itemId, quantity: 0.1 });

      expect(await totalText(f.materialId)).toBe('0');
    });

    it('transfer', async () => {
      const f = await fixture();
      const { itemId } = await createTransfer(
        f.materialId,
        f.batchId,
        0.1,
        f.unitId,
      );

      await transferService.transfer({ itemId, quantity: 0.1 });

      expect(await totalText(f.materialId)).toBe('0.3');
    });

    it('hold', async () => {
      const f = await fixture();

      await app.get(HoldInventoryOrderService).createHoldInventoryOrder({
        items: [
          {
            materialId: f.materialId,
            batchId: f.batchId,
            locationId: shelfId,
            unitId: f.unitId,
            targetHeldQuantity: 0.1,
          },
        ],
      });

      expect(await totalText(f.materialId)).toBe('0.3');
    });

    it('allocate', async () => {
      const f = await fixture();

      await app
        .get(AllocateInventoryOrderService)
        .createAllocateInventoryOrder({
          items: [
            {
              materialId: f.materialId,
              batchId: f.batchId,
              locationId: shelfId,
              unitId: f.unitId,
              targetAllocatedQuantity: 0.1,
              saleId: 'DEC-SO',
              saleSerialId: '1',
            },
          ],
        } as Parameters<
          AllocateInventoryOrderService['createAllocateInventoryOrder']
        >[0]);

      expect(await totalText(f.materialId)).toBe('0.3');
    });

    it('transfer to a vendor', async () => {
      const f = await fixture();

      await app.get(TransferVendorOrderService).createTransferVendorOrder({
        vendorId: 'DEC-V',
        items: [
          {
            materialId: f.materialId,
            batchId: f.batchId,
            locationId: shelfId,
            unitId: f.unitId,
            targetTransferredQuantity: 0.1,
          },
        ],
      } as Parameters<
        TransferVendorOrderService['createTransferVendorOrder']
      >[0]);

      expect(await totalText(f.materialId)).toBe('0.3');
    });

    it('transfer to a customer', async () => {
      const f = await fixture();

      await app.get(TransferCustomerOrderService).createTransferCustomerOrder({
        customerId: 'DEC-C',
        items: [
          {
            materialId: f.materialId,
            batchId: f.batchId,
            locationId: shelfId,
            unitId: f.unitId,
            targetTransferredQuantity: 0.1,
          },
        ],
      } as Parameters<
        TransferCustomerOrderService['createTransferCustomerOrder']
      >[0]);

      expect(await totalText(f.materialId)).toBe('0.3');
    });

    it('scrape', async () => {
      const f = await fixture();

      await app.get(ScrapeService).scrape([
        {
          materialId: f.materialId,
          batchId: f.batchId,
          locationId: shelfId,
          unitId: f.unitId,
          quantity: 0.1,
        },
      ] as Parameters<ScrapeService['scrape']>[0]);

      expect(await totalText(f.materialId)).toBe('0');
    });

    it('split', async () => {
      const f = await fixture();

      await app.get(SplitBatchOrderService).split({
        batchId: f.batchId,
        unitId: f.unitId,
        items: [
          { batchKey: unique('DEC-SPLIT'), quantity: 0.1, locationId: shelfId },
        ],
      } as Parameters<SplitBatchOrderService['split']>[0]);

      expect(await totalText(f.materialId)).toBe('0.3');
    });

    it('merge', async () => {
      const f = await fixture();

      await app.get(MergeBatchOrderService).merge({
        batchKey: unique('DEC-MERGE'),
        materialId: f.materialId,
        items: [
          {
            batchId: f.batchId,
            locationId: shelfId,
            quantity: 0.1,
            unitId: f.unitId,
          },
        ],
      } as Parameters<MergeBatchOrderService['merge']>[0]);

      expect(await totalText(f.materialId)).toBe('0.3');
    });

    const consumptionOrderOf = async (
      f: Awaited<ReturnType<typeof fixture>>,
    ): Promise<string> =>
      (
        await app.get(ConsumptionOrderService).createConsumptionOrder({
          items: [
            {
              materialId: f.materialId,
              batchId: f.batchId,
              locationId: shelfId,
              targetLocationId: benchId,
              unitId: f.unitId,
              quantity: 0.1,
            },
          ],
        })
      ).id;

    it('consumption: issue and return', async () => {
      const f = await fixture();
      const service = app.get(ConsumptionOrderService);
      const orderId = await consumptionOrderOf(f);

      await service.issue({ orderId });
      await service.return({ orderId });

      expect(await totalText(f.materialId)).toBe('0.3');
    });

    it('consumption: issue and settle', async () => {
      const f = await fixture();
      const service = app.get(ConsumptionOrderService);
      const orderId = await consumptionOrderOf(f);

      await service.issue({ orderId });
      await service.settle({ orderId });

      expect(await totalText(f.materialId)).toBe('0');
    });

    it('inventory count: an added line of 0.1 in the unit settles as 0.3', async () => {
      const material = await newMaterial();
      const bayId = await newLocation(unique('DEC-COUNT-BAY'));

      await seedStock((await newMaterial()).id, 1, { locationId: bayId });

      const service = app.get(InventoryCountOrderService);
      const order = await service.create({
        name: unique('DEC-COUNT'),
        countDate: '2026-11-01',
        locationIds: [bayId],
      });

      await service.start(order.id);
      await service.addItem(order.id, {
        materialId: material.id,
        batchKey: unique('DEC-COUNT-BATCH'),
        locationId: bayId,
        unitId: material.tenthUnitId,
        countedQuantity: 0.1,
      });
      await service.settle(order.id);

      expect(await totalText(material.id)).toBe('0.3');
    });
  });
});
