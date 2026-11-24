import { ConflictException, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GraphQLModule, GraphQLSchemaHost } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { TypeOrmModule } from '@nestjs/typeorm';
import { type ExecutionResult, type GraphQLSchema, graphql } from 'graphql';
import { Client } from 'pg';
import { DataSource, type DeepPartial, type EntityManager } from 'typeorm';
import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import {
  AllocateInventoryOrderService,
  BatchEntityClass,
  BatchService,
  ConsumptionOrderItemEntityClass,
  ConsumptionOrderService,
  HoldInventoryOrderService,
  InventoryCountOrderService,
  LoaderService,
  LoadersEntityClass,
  LocationEntityClass,
  MaterialService,
  MaterialUnitEntityClass,
  ShipInventoryOrderItemEntityClass,
  ShipInventoryOrderService,
  StockEntityClass,
  StockService,
  StockStatus,
  TransferOrderItemEntityClass,
  TransferOrderService,
  WmsEntities,
  WmsOperationRunner,
  type WmsAfterEventContext,
} from '@rytass/wms-module-core';
import { WmsModuleGraphqlModule } from './graphql.module';
import {
  LoaderService as DataLoaderService,
  createWmsLoaders,
} from './helpers';

/**
 * #225: a loader that holds reserved stock could not be moved. A whole-loader
 * transfer refuses any loader with non-FREE stock, and the transfer machinery
 * splits every batch into a `transferId` child that drops the `inShipment`
 * flag -- so the only way out was cancelling the reservation, moving, and
 * reserving again.
 *
 * `TransferOrderService.moveLoader` moves the loader and everything on it with
 * the batch ids and flags untouched, and re-points the unfinished lines that
 * name the loader at its new location.
 *
 * Requires a reachable PostgreSQL; override with WMS_TEST_DB_* env vars.
 */
const DB_HOST = process.env['WMS_TEST_DB_HOST'] ?? 'localhost';
const DB_PORT = Number(process.env['WMS_TEST_DB_PORT'] ?? 5432);
const DB_USER =
  process.env['WMS_TEST_DB_USER'] ?? process.env['USER'] ?? 'postgres';
const DB_PASS = process.env['WMS_TEST_DB_PASS'];
const DB_NAME =
  process.env['WMS_TEST_MOVE_LOADER_DB_NAME'] ?? 'wms_module_move_loader_test';

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

class Rollback extends Error {
  constructor() {
    super('rollback on purpose');
  }
}

interface RecordedEvent {
  readonly event: string;
  readonly changeType: string | null;
  readonly quantityDelta: number;
}

const recorded: RecordedEvent[] = [];

const recordEvent = async (context: WmsAfterEventContext): Promise<void> => {
  const payload = context.payload as {
    changeType: string | null;
    quantityDelta: number;
  };

  recorded.push({
    event: context.event,
    changeType: payload.changeType ?? null,
    quantityDelta: payload.quantityDelta,
  });
};

type TransferItemInput = Parameters<
  TransferOrderService['createTransferOrder']
>[0]['items'][number];

describe('moving a loader with its stock (#225)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let entities: WmsEntities;
  let stockService: StockService;
  let batchService: BatchService;
  let transferService: TransferOrderService;
  let shipService: ShipInventoryOrderService;
  let holdService: HoldInventoryOrderService;
  let allocateService: AllocateInventoryOrderService;
  let consumptionService: ConsumptionOrderService;
  let countService: InventoryCountOrderService;
  let loaderService: LoaderService;
  let runner: WmsOperationRunner;
  let schema: GraphQLSchema;

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
    const key = unique('MV-MAT');
    const material = await app.get(MaterialService).createMaterial({
      key,
      description: 'move loader',
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

  const newLoader = async (locationId: string = shelfId): Promise<string> => {
    const [loader] = await loaderService.createLoader({
      typeId: palletTypeId,
      locationId,
      quantity: 1,
    });

    return loader.id;
  };

  const loaderLocation = async (
    loaderId: string,
    manager: EntityManager = dataSource.manager,
  ): Promise<string | null> =>
    (
      await manager
        .getRepository<LoadersEntityClass>(LoadersEntityClass)
        .findOneByOrFail({ id: loaderId })
    ).locationId;

  /** A fresh batch of `quantity` on `loaderId`, at the loader's own location. */
  const seedStock = async (
    materialId: string,
    quantity: number | readonly number[],
    loaderId: string,
    locationId: string = shelfId,
  ): Promise<{ batchId: string }> => {
    const batch = await batchService.getBatch({
      key: unique('MV-BATCH'),
      materialId,
    });
    const orderRepository = dataSource.getRepository<OrderEntity>(
      entities.order,
    );
    const stockRepository = dataSource.getRepository<StockEntityClass>(
      entities.stock,
    );

    for (const part of Array.isArray(quantity) ? quantity : [quantity]) {
      const base = await orderRepository.save(orderRepository.create({}));

      await stockRepository.save({
        orderId: base.id,
        materialId,
        batchId: batch.id,
        locationId,
        loaderId,
        quantity: part,
      } as DeepPartial<StockEntityClass>);
    }

    return { batchId: batch.id };
  };

  const stockTable = (): string =>
    dataSource.getMetadata(entities.stock).tablePath;

  /** The whole ledger of a material, as a float8 prints it. */
  const totalText = async (materialId: string): Promise<string> => {
    const [row] = await dataSource.query<[{ total: string }]>(
      `SELECT COALESCE(SUM(quantity), 0)::float8::text AS total FROM "${stockTable()}" WHERE "materialId" = $1`,
      [materialId],
    );

    return row.total;
  };

  /** Net quantity of a material at one location, as a float8 prints it. */
  const quantityAtText = async (
    materialId: string,
    locationId: string,
  ): Promise<string> => {
    const [row] = await dataSource.query<[{ total: string }]>(
      `SELECT COALESCE(SUM(quantity), 0)::float8::text AS total FROM "${stockTable()}" WHERE "materialId" = $1 AND "locationId" = $2`,
      [materialId, locationId],
    );

    return row.total;
  };

  /** Quantity per status for one material at one location. */
  const byStatus = async (
    materialId: string,
    locationId: string,
  ): Promise<Partial<Record<StockStatus, number>>> => {
    const [rows] = await stockService.findAggregatedStocks({
      materialId,
      locationId,
    });

    return rows.reduce<Partial<Record<StockStatus, number>>>(
      (totals, row) => ({
        ...totals,
        [row.status]: (totals[row.status] ?? 0) + Number(row.quantity),
      }),
      {},
    );
  };

  /** Every non-empty (batch, status) a loader holds, with where and how much. */
  const holdings = async (
    loaderId: string,
  ): Promise<
    { batchId: string; status: StockStatus; locationId: string; qty: number }[]
  > => {
    const [rows] = await stockService.findAggregatedStocks({ loaderId });

    return rows
      .filter((row) => Number(row.quantity) !== 0)
      .map((row) => ({
        batchId: row.batchId,
        status: row.status,
        locationId: row.locationId,
        qty: Number(row.quantity),
      }))
      .sort((a, b) =>
        `${a.batchId}${a.status}`.localeCompare(`${b.batchId}${b.status}`),
      );
  };

  const createShip = async (
    materialId: string,
    batchId: string,
    quantity: number,
    loaderId: string,
    locationId: string = shelfId,
  ): Promise<{ itemId: string }> =>
    dataSource.transaction(async (manager) => {
      const order = await shipService.createShipInventoryOrder({
        key: unique('MV-SHIP'),
        description: 'move loader ship',
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
              locationId,
              loaderId,
              targetShippedQuantity: quantity,
              status: StockStatus.FREE,
              serialId: unique('MV-SHIP-LINE'),
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

  const shipItemLocation = async (
    itemId: string,
    manager: EntityManager = dataSource.manager,
  ): Promise<string | null> =>
    (
      await manager
        .getRepository<ShipInventoryOrderItemEntityClass>(
          shipService.shipInventoryOrderItemEntity,
        )
        .findOneByOrFail({ id: itemId })
    ).locationId;

  /** Rows in `stocks`, `loaders` and every `*_order_changes`. */
  const ledgerCounts = async (
    manager: EntityManager,
  ): Promise<Record<string, number>> => {
    const tables = dataSource.entityMetadatas
      .map((metadata) => metadata.tablePath)
      .filter(
        (table, index, all) =>
          all.indexOf(table) === index &&
          (table.endsWith('_order_changes') ||
            table.endsWith('_order_items') ||
            table.endsWith('transfer_orders') ||
            table.endsWith('stocks')),
      );
    const counts = await Promise.all(
      tables.map(async (table): Promise<[string, number]> => {
        const [{ count }] = await manager.query<[{ count: string }]>(
          `SELECT COUNT(*) AS count FROM "${table}"`,
        );

        return [table, Number(count)];
      }),
    );

    return Object.fromEntries(counts);
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
        WmsModuleGraphqlModule.forRootAsync({
          useFactory: async () => ({}),
          defaultLoaderSerialId: 'DEFAULT',
          defaultLoaderTypeKey: 'DEFAULT',
          defaultLocationKey: 'DEFAULT',
          afterListeners: {
            'stock.transferred': recordEvent,
            'stock.in-transfer': recordEvent,
            'stock.transfer-cancelled': recordEvent,
            'transfer-order.loader-moved': recordEvent,
          },
        }),
        GraphQLModule.forRootAsync({
          driver: ApolloDriver,
          inject: [DataLoaderService],
          useFactory: (injected: DataLoaderService) => ({
            autoSchemaFile: true,
            context: () => ({ ...createWmsLoaders(injected) }),
          }),
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
    shipService = app.get(ShipInventoryOrderService);
    holdService = app.get(HoldInventoryOrderService);
    allocateService = app.get(AllocateInventoryOrderService);
    consumptionService = app.get(ConsumptionOrderService);
    countService = app.get(InventoryCountOrderService);
    loaderService = app.get(LoaderService);
    runner = app.get(WmsOperationRunner);
    schema = app.get(GraphQLSchemaHost).schema;

    shelfId = await newLocation('MV-SHELF');
    dockId = await newLocation('MV-DOCK');
    benchId = await newLocation('MV-BENCH');
    palletTypeId = (
      await loaderService.createLoaderType({
        key: 'MVP',
        description: 'pallet',
      })
    ).id;
  });

  afterAll(async () => {
    await app?.close();
    await resetDatabase(false);
  });

  beforeEach(() => {
    recorded.length = 0;
  });

  describe('the reproduction from the issue', () => {
    it('refuses a whole-loader transfer of a loader with reserved stock, as before', async () => {
      const material = await newMaterial();
      const loaderId = await newLoader();
      const { batchId } = await seedStock(material.id, 30, loaderId);

      await createShip(material.id, batchId, 10, loaderId);

      await expect(
        transferService.createTransferOrder({
          locationId: dockId,
          loaderId,
          items: [
            {
              materialId: material.id,
              batchId,
              locationId: shelfId,
              loaderId,
              targetTransferredQuantity: 20,
            } as TransferItemInput,
          ],
        }),
      ).rejects.toThrow(/non-FREE stocks \(statuses: IN_SHIPMENT\)/);
    });

    it('moves the loader and the reserved stock, and the shipment completes at the new location', async () => {
      const material = await newMaterial();
      const loaderId = await newLoader();
      const { batchId } = await seedStock(material.id, 30, loaderId);
      const { itemId } = await createShip(material.id, batchId, 10, loaderId);

      expect(await byStatus(material.id, shelfId)).toMatchObject({
        [StockStatus.FREE]: 20,
        [StockStatus.IN_SHIPMENT]: 10,
      });

      await transferService.moveLoader({
        loaderId,
        targetLocationId: dockId,
      });

      expect(await loaderLocation(loaderId)).toBe(dockId);
      expect(await byStatus(material.id, dockId)).toMatchObject({
        [StockStatus.FREE]: 20,
        [StockStatus.IN_SHIPMENT]: 10,
      });
      expect(await quantityAtText(material.id, shelfId)).toBe('0');
      expect(await shipItemLocation(itemId)).toBe(dockId);

      await expect(shipService.ship({ itemId, quantity: 10 })).resolves.toBe(
        true,
      );

      const after = await byStatus(material.id, dockId);

      expect(after[StockStatus.FREE]).toBe(20);
      expect(after[StockStatus.IN_SHIPMENT] ?? 0).toBe(0);
      expect(await totalText(material.id)).toBe('20');
      expect(await quantityAtText(material.id, shelfId)).toBe('0');
    });

    it('a reservation can still be cancelled after the move', async () => {
      const material = await newMaterial();
      const loaderId = await newLoader();
      const { batchId } = await seedStock(material.id, 30, loaderId);
      const { itemId } = await createShip(material.id, batchId, 10, loaderId);

      await transferService.moveLoader({ loaderId, targetLocationId: dockId });
      await shipService.cancelShip({ itemId });

      const after = await byStatus(material.id, dockId);

      expect(after[StockStatus.FREE]).toBe(30);
      expect(after[StockStatus.IN_SHIPMENT] ?? 0).toBe(0);
      expect(await totalText(material.id)).toBe('30');
    });

    it('a shipment can be made in two parts, one on each side of the move', async () => {
      const material = await newMaterial();
      const loaderId = await newLoader();
      const { batchId } = await seedStock(material.id, 30, loaderId);
      const { itemId } = await createShip(material.id, batchId, 10, loaderId);

      await shipService.ship({ itemId, quantity: 4 });
      await transferService.moveLoader({ loaderId, targetLocationId: dockId });
      await shipService.ship({ itemId, quantity: 6 });

      expect(await totalText(material.id)).toBe('20');
      expect((await byStatus(material.id, dockId))[StockStatus.FREE]).toBe(20);
    });

    it('a line that is already fully shipped keeps the location it shipped from', async () => {
      const material = await newMaterial();
      const loaderId = await newLoader();
      const { batchId } = await seedStock(material.id, 30, loaderId);
      const { itemId } = await createShip(material.id, batchId, 10, loaderId);

      await shipService.ship({ itemId, quantity: 10 });
      await transferService.moveLoader({ loaderId, targetLocationId: dockId });

      expect(await shipItemLocation(itemId)).toBe(shelfId);
    });
  });

  describe('what travels with the loader', () => {
    it('keeps every batch id and every flag: held, allocated, reserved and free', async () => {
      const material = await newMaterial();
      const loaderId = await newLoader();
      const free = await seedStock(material.id, 10, loaderId);
      const held = await seedStock(material.id, 10, loaderId);
      const allocated = await seedStock(material.id, 10, loaderId);
      const reserved = await seedStock(material.id, 10, loaderId);

      await holdService.createHoldInventoryOrder({
        items: [
          {
            materialId: material.id,
            batchId: held.batchId,
            locationId: shelfId,
            loaderId,
            targetHeldQuantity: 4,
          },
        ],
      });
      await allocateService.createAllocateInventoryOrder({
        items: [
          {
            materialId: material.id,
            batchId: allocated.batchId,
            locationId: shelfId,
            loaderId,
            targetAllocatedQuantity: 3,
            saleId: 'MV-SO',
            saleSerialId: '1',
          },
        ],
      } as Parameters<
        AllocateInventoryOrderService['createAllocateInventoryOrder']
      >[0]);
      await createShip(material.id, reserved.batchId, 5, loaderId);

      const before = await holdings(loaderId);
      const batchRows = async (): Promise<BatchEntityClass[]> =>
        dataSource
          .getRepository<BatchEntityClass>(entities.batch)
          .find({ where: { materialId: material.id }, order: { id: 'ASC' } });
      const batchesBefore = await batchRows();

      expect(before.map(({ status }) => status)).toEqual(
        expect.arrayContaining([
          StockStatus.FREE,
          StockStatus.HELD,
          StockStatus.IN_SHIPMENT,
        ]),
      );
      // Allocation is a sale reference on the batch, not a status of its own.
      expect(batchesBefore.some(({ saleId }) => saleId === 'MV-SO')).toBe(true);

      await transferService.moveLoader({ loaderId, targetLocationId: dockId });

      const after = await holdings(loaderId);

      expect(after).toEqual(
        before.map((row) => ({ ...row, locationId: dockId })),
      );
      // No batch was split, merged or re-flagged on the way.
      expect(await batchRows()).toEqual(batchesBefore);
      expect(free.batchId).toBeDefined();
      expect(await quantityAtText(material.id, shelfId)).toBe('0');
      expect(await totalText(material.id)).toBe('40');
    });

    it('moves a loader that sits on several materials in one order', async () => {
      const first = await newMaterial();
      const second = await newMaterial();
      const loaderId = await newLoader();

      await seedStock(first.id, 7, loaderId);
      await seedStock(second.id, 9, loaderId);

      const order = await transferService.moveLoader({
        loaderId,
        targetLocationId: benchId,
      });
      const items = await dataSource
        .getRepository<TransferOrderItemEntityClass>(
          transferService.transferOrderItemEntity,
        )
        .find({ where: { orderId: order.id } });

      expect(items).toHaveLength(2);
      items.forEach((item) => {
        expect(item.loaderId).toBe(loaderId);
        expect(item.targetLoaderId).toBe(loaderId);
        expect(item.locationId).toBe(shelfId);
        expect(item.targetLocationId).toBe(benchId);
      });
      expect(await quantityAtText(first.id, benchId)).toBe('7');
      expect(await quantityAtText(second.id, benchId)).toBe('9');
    });
  });

  describe('the record it leaves', () => {
    it('is a transfer order the change log lists as TRANSFERRED, with a stock.transferred event per line', async () => {
      const material = await newMaterial();
      const loaderId = await newLoader();

      await seedStock(material.id, 12, loaderId);
      await seedStock(material.id, 8, loaderId);

      await runner.run({}, () =>
        transferService.moveLoader({ loaderId, targetLocationId: dockId }),
      );

      const [logs] = await stockService.findChangeLogs({
        materialId: material.id,
      });

      expect(logs.map(({ changeType }) => changeType)).toEqual([
        'TRANSFERRED',
        'TRANSFERRED',
      ]);
      expect(
        logs.map(({ quantity }) => Number(quantity)).sort((a, b) => a - b),
      ).toEqual([-12, -8]);
      expect(recorded.map(({ event }) => event)).toEqual([
        'stock.transferred',
        'stock.transferred',
      ]);
      expect(
        recorded.every(({ changeType }) => changeType === 'TRANSFERRED'),
      ).toBe(true);
    });

    it('leaves nothing for the transfer order to execute or cancel', async () => {
      const material = await newMaterial();
      const loaderId = await newLoader();

      await seedStock(material.id, 5, loaderId);

      const order = await transferService.moveLoader({
        loaderId,
        targetLocationId: dockId,
      });
      const [item] = await dataSource
        .getRepository<TransferOrderItemEntityClass>(
          transferService.transferOrderItemEntity,
        )
        .find({ where: { orderId: order.id } });

      await expect(
        transferService.transfer({ itemId: item.id, quantity: 5 }),
      ).rejects.toThrow(/exceeds remaining quantity/);
      await expect(
        transferService.cancelTransfer({ itemId: item.id }),
      ).resolves.toBe(true);
      expect(await quantityAtText(material.id, dockId)).toBe('5');
    });
  });

  describe('unfinished lines that name the loader follow it', () => {
    it('a pending transfer out of the loader executes from the new location', async () => {
      const material = await newMaterial();
      const loaderId = await newLoader();
      const { batchId } = await seedStock(material.id, 10, loaderId);
      const order = await transferService.createTransferOrder({
        locationId: dockId,
        items: [
          {
            materialId: material.id,
            batchId,
            locationId: shelfId,
            loaderId,
            targetTransferredQuantity: 6,
          } as TransferItemInput,
        ],
      });
      const itemRepository =
        dataSource.getRepository<TransferOrderItemEntityClass>(
          transferService.transferOrderItemEntity,
        );
      const [item] = await itemRepository.find({
        where: { orderId: order.id },
      });

      await transferService.moveLoader({ loaderId, targetLocationId: benchId });

      expect(
        (await itemRepository.findOneByOrFail({ id: item.id })).locationId,
      ).toBe(benchId);
      await expect(
        transferService.transfer({ itemId: item.id, quantity: 6 }),
      ).resolves.toBe(true);

      expect(await quantityAtText(material.id, dockId)).toBe('6');
      expect(await quantityAtText(material.id, benchId)).toBe('4');
      expect(await quantityAtText(material.id, shelfId)).toBe('0');
    });

    it('an open consumption line follows its source loader and its consuming loader', async () => {
      const material = await newMaterial();
      const source = await newLoader(shelfId);
      const consuming = await newLoader(benchId);
      const { batchId } = await seedStock(material.id, 10, source);
      const order = await consumptionService.createConsumptionOrder({
        items: [
          {
            materialId: material.id,
            batchId,
            locationId: shelfId,
            loaderId: source,
            targetLocationId: benchId,
            targetLoaderId: consuming,
            quantity: 6,
          },
        ],
      });
      const itemOf = async (): Promise<ConsumptionOrderItemEntityClass> =>
        dataSource
          .getRepository<ConsumptionOrderItemEntityClass>(
            consumptionService.consumptionOrderItemEntity,
          )
          .findOneOrFail({ where: { orderId: order.id } });

      await consumptionService.issue({ orderId: order.id });
      // Issued onto the consuming loader; nothing left to issue, six outstanding.
      await transferService.moveLoader({
        loaderId: consuming,
        targetLocationId: dockId,
      });

      expect((await itemOf()).targetLocationId).toBe(dockId);
      expect((await itemOf()).locationId).toBe(shelfId);

      await transferService.moveLoader({
        loaderId: source,
        targetLocationId: benchId,
      });

      expect((await itemOf()).locationId).toBe(benchId);

      await expect(
        consumptionService.return({ orderId: order.id }),
      ).resolves.toBe(true);
      expect(await quantityAtText(material.id, dockId)).toBe('0');
      expect(await quantityAtText(material.id, benchId)).toBe('10');
    });

    it('leaves hold and allocate lines alone: nothing reads them after the fact', async () => {
      const material = await newMaterial();
      const loaderId = await newLoader();
      const { batchId } = await seedStock(material.id, 10, loaderId);

      const hold = await holdService.createHoldInventoryOrder({
        items: [
          {
            materialId: material.id,
            batchId,
            locationId: shelfId,
            loaderId,
            targetHeldQuantity: 4,
          },
        ],
      });

      await transferService.moveLoader({ loaderId, targetLocationId: dockId });

      const [line] = await dataSource.query<[{ locationId: string }]>(
        `SELECT "locationId" FROM "${dataSource.getMetadata(holdService.holdInventoryOrderItemEntity).tablePath}" WHERE "orderId" = $1`,
        [hold.id],
      );

      expect(line.locationId).toBe(shelfId);
      // ... and the held quantity it describes is released from where it now is.
      await holdService.release({
        materialId: material.id,
        batchId: (
          await stockService.findAggregatedStocks({
            materialId: material.id,
            loaderId,
          })
        )[0].find((row) => row.status === StockStatus.HELD)?.batchId as string,
        locationId: dockId,
        loaderId,
        quantity: 4,
      });

      expect((await byStatus(material.id, dockId))[StockStatus.FREE]).toBe(10);
    });
  });

  describe('refusals', () => {
    it('refuses a source or a target location that a running count has locked, and writes nothing', async () => {
      const material = await newMaterial();
      const loaderId = await newLoader();
      const { batchId } = await seedStock(material.id, 10, loaderId);
      const { itemId } = await createShip(material.id, batchId, 4, loaderId);

      const probe = async (): Promise<unknown> => [
        await ledgerCounts(dataSource.manager),
        await loaderLocation(loaderId),
        await shipItemLocation(itemId),
      ];
      for (const [locked, free] of [
        [shelfId, dockId],
        [dockId, shelfId],
      ] as const) {
        // A count needs stock in its scope to snapshot; the other loader's will do.
        const countedLoader = await newLoader(locked);

        await seedStock((await newMaterial()).id, 1, countedLoader, locked);

        const count = await countService.create({
          name: unique('MV-COUNT'),
          countDate: '2026-11-01',
          locationIds: [locked],
        });

        await countService.start(count.id);

        // Read once the count has snapshotted its scope: starting it writes
        // its own item rows.
        const before = await probe();

        try {
          const target = locked === shelfId ? free : locked;

          await expect(
            dataSource.transaction((manager) =>
              transferService.moveLoader(
                { loaderId, targetLocationId: target },
                manager,
              ),
            ),
          ).rejects.toBeInstanceOf(ConflictException);
          expect(await probe()).toEqual(before);
        } finally {
          await countService.cancel(count.id);
        }
      }
    });

    it('does not write when the count lock is hit on an outer manager that carries on', async () => {
      const material = await newMaterial();
      const loaderId = await newLoader();

      await seedStock(material.id, 10, loaderId);
      await seedStock(
        (await newMaterial()).id,
        1,
        await newLoader(dockId),
        dockId,
      );

      const count = await countService.create({
        name: unique('MV-COUNT'),
        countDate: '2026-11-01',
        locationIds: [dockId],
      });

      await countService.start(count.id);

      try {
        const before = await ledgerCounts(dataSource.manager);

        await dataSource.transaction(async (manager) => {
          await expect(
            transferService.moveLoader(
              { loaderId, targetLocationId: dockId },
              manager,
            ),
          ).rejects.toBeInstanceOf(ConflictException);

          // The host swallowed the refusal and kept its transaction: nothing
          // of the attempt may be sitting in it.
          expect(await ledgerCounts(manager)).toEqual(before);
          expect(await loaderLocation(loaderId, manager)).toBe(shelfId);
        });
      } finally {
        await countService.cancel(count.id);
      }
    });

    it('refuses a loader with no stock, the default loader, the current location and unknown ids', async () => {
      const material = await newMaterial();
      const empty = await newLoader();
      const loaderId = await newLoader();

      await seedStock(material.id, 3, loaderId);

      await expect(
        transferService.moveLoader({
          loaderId: empty,
          targetLocationId: dockId,
        }),
      ).rejects.toThrow(/holds no stock/);
      await expect(
        transferService.moveLoader({
          loaderId: stockService.defaultLoaderId,
          targetLocationId: dockId,
        }),
      ).rejects.toThrow(/default loader/);
      await expect(
        transferService.moveLoader({ loaderId, targetLocationId: shelfId }),
      ).rejects.toThrow(/already at/);
      await expect(
        transferService.moveLoader({
          loaderId,
          targetLocationId: '00000000-0000-4000-8000-000000000000',
        }),
      ).rejects.toThrow(/does not exist/);
      await expect(
        transferService.moveLoader({
          loaderId: '00000000-0000-4000-8000-000000000000',
          targetLocationId: dockId,
        }),
      ).rejects.toThrow(/does not exist/);
      expect(await loaderLocation(loaderId)).toBe(shelfId);
    });
  });

  describe('as a host calls it, inside its own transaction', () => {
    it('rolls back with the host: no row, no loader move, no re-pointed line', async () => {
      const material = await newMaterial();
      const loaderId = await newLoader();
      const { batchId } = await seedStock(material.id, 10, loaderId);
      const { itemId } = await createShip(material.id, batchId, 4, loaderId);
      const probe = async (manager: EntityManager): Promise<unknown> => [
        await ledgerCounts(manager),
        await loaderLocation(loaderId, manager),
        await shipItemLocation(itemId, manager),
      ];
      const before = await probe(dataSource.manager);

      await expect(
        dataSource.transaction(async (manager) => {
          await transferService.moveLoader(
            { loaderId, targetLocationId: dockId },
            manager,
          );

          // It did write, and on this transaction's connection.
          expect(await probe(manager)).not.toEqual(before);

          throw new Rollback();
        }),
      ).rejects.toBeInstanceOf(Rollback);

      expect(await probe(dataSource.manager)).toEqual(before);
    });

    it('dispatches stock.transferred only after the host commits', async () => {
      const material = await newMaterial();
      const loaderId = await newLoader();

      await seedStock(material.id, 10, loaderId);

      await expect(
        runner.run({}, () =>
          dataSource.transaction(async (manager) => {
            await transferService.moveLoader(
              { loaderId, targetLocationId: dockId },
              manager,
            );
            throw new Rollback();
          }),
        ),
      ).rejects.toBeInstanceOf(Rollback);

      expect(recorded).toEqual([]);

      await runner.run({}, () =>
        dataSource.transaction((manager) =>
          transferService.moveLoader(
            { loaderId, targetLocationId: dockId },
            manager,
          ),
        ),
      );

      expect(recorded.map(({ event }) => event)).toEqual(['stock.transferred']);
    });
  });

  describe('quantities in tenths', () => {
    it('moves 0.1 + 0.2 on one batch and 0.3 on another without a float tail', async () => {
      const material = await newMaterial();
      const loaderId = await newLoader();
      const split = await seedStock(material.id, [0.1, 0.2], loaderId);

      await seedStock(material.id, 0.3, loaderId);

      const order = await transferService.moveLoader({
        loaderId,
        targetLocationId: dockId,
      });
      const items = await dataSource
        .getRepository<TransferOrderItemEntityClass>(
          transferService.transferOrderItemEntity,
        )
        .find({ where: { orderId: order.id } });

      expect(
        items
          .map(({ targetTransferredQuantity }) => targetTransferredQuantity)
          .sort(),
      ).toEqual([0.3, 0.3]);
      expect(await quantityAtText(material.id, dockId)).toBe('0.6');
      expect(await quantityAtText(material.id, shelfId)).toBe('0');
      expect(
        (await holdings(loaderId)).find(
          ({ batchId }) => batchId === split.batchId,
        )?.qty,
      ).toBe(0.3);
    });

    it('moves a reserved tenth and ships it from the new location', async () => {
      const material = await newMaterial();
      const loaderId = await newLoader();
      const { batchId } = await seedStock(material.id, 0.3, loaderId);
      const { itemId } = await createShip(material.id, batchId, 0.1, loaderId);

      await transferService.moveLoader({ loaderId, targetLocationId: dockId });
      await shipService.ship({ itemId, quantity: 0.1 });

      expect(await quantityAtText(material.id, dockId)).toBe('0.2');
      expect(await totalText(material.id)).toBe('0.2');
    });
  });

  describe('through the schema', () => {
    const execute = async (
      source: string,
    ): Promise<ExecutionResult<Record<string, unknown>>> =>
      graphql({
        schema,
        source,
        contextValue: { ...createWmsLoaders(app.get(DataLoaderService)) },
      }) as Promise<ExecutionResult<Record<string, unknown>>>;

    it('moveLoader moves the loader and dispatches the operation event and one stock event per slot', async () => {
      const material = await newMaterial();
      const loaderId = await newLoader();
      const { batchId } = await seedStock(material.id, 10, loaderId);
      const { itemId } = await createShip(material.id, batchId, 4, loaderId);

      const result = await execute(`mutation {
        moveLoader(loaderId: "${loaderId}", targetLocationId: "${dockId}") {
          id
          items { loader { id } location { id } transferredQuantity }
        }
      }`);

      expect(result.errors).toBeUndefined();
      expect(await loaderLocation(loaderId)).toBe(dockId);
      expect(await shipItemLocation(itemId)).toBe(dockId);
      expect(
        (result.data?.['moveLoader'] as { items: unknown[] }).items,
      ).toHaveLength(2);
      expect(recorded.map(({ event }) => event).sort()).toEqual([
        'stock.transferred',
        'stock.transferred',
        'transfer-order.loader-moved',
      ]);
    });

    it('refuses a locked location as an error and leaves the loader where it was', async () => {
      const material = await newMaterial();
      const loaderId = await newLoader();

      await seedStock(material.id, 10, loaderId);
      await seedStock(
        (await newMaterial()).id,
        1,
        await newLoader(benchId),
        benchId,
      );

      const count = await countService.create({
        name: unique('MV-COUNT'),
        countDate: '2026-11-01',
        locationIds: [benchId],
      });

      await countService.start(count.id);

      try {
        const result = await execute(`mutation {
          moveLoader(loaderId: "${loaderId}", targetLocationId: "${benchId}") { id }
        }`);

        expect(result.errors?.[0]?.message).toMatch(
          /locked by inventory count/,
        );
        expect(await loaderLocation(loaderId)).toBe(shelfId);
        expect(recorded).toEqual([]);
      } finally {
        await countService.cancel(count.id);
      }
    });
  });
});
