import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import {
  DataSource,
  type DeepPartial,
  type EntityManager,
  type QueryRunner,
} from 'typeorm';
import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import {
  AllocateInventoryOrderService,
  BatchEntityClass,
  BatchService,
  ConsumptionOrderService,
  HoldInventoryOrderService,
  LoaderService,
  LoaderTypeEntityClass,
  LoadersEntityClass,
  LocationEntityClass,
  MaterialEntityClass,
  ReceiveInventoryOrderItemEntityClass,
  ReceiveInventoryOrderService,
  ScrapeService,
  ShipInventoryOrderItemEntityClass,
  ShipInventoryOrderService,
  StockEntityClass,
  StockService,
  StockStatus,
  TransferOrderItemEntityClass,
  TransferOrderService,
  WmsEntities,
  WmsModuleCoreModule,
  WmsOperationRunner,
  type WmsAfterEventContext,
  getWmsTablePrefix,
  WmsSequenceService,
} from '@rytass/wms-module-core';

/**
 * A host that uses the services and nothing else.
 *
 * Shuttle mounts `WmsModuleCoreModule` without `WmsModuleGraphqlModule` and
 * calls services from inside its own transactions (deduct stock, write its own
 * outbox row, move its own document's status — all or nothing). Every spec
 * before this one entered through the GraphQL schema, so none of what follows
 * was covered:
 *
 * - B2: every stock-writing method joins the caller's transaction. Before the
 *   fix they each opened `dataSource.transaction(...)` on a fresh connection,
 *   so the writes committed on their own and survived the host's rollback —
 *   the rollback cases below would all fail on "count is back to before".
 * - B3: `validateStockAvailability` used an unlocked `SUM`, so two concurrent
 *   deductions both passed and oversold. The lock case would see B finish
 *   without ever waiting.
 * - #183 / #184 / #185 / #186 reproductions, each named after its issue.
 *
 * Requires a reachable PostgreSQL; override with WMS_TEST_DB_* env vars.
 */
const DB_HOST = process.env['WMS_TEST_DB_HOST'] ?? 'localhost';
const DB_PORT = Number(process.env['WMS_TEST_DB_PORT'] ?? 5432);
const DB_USER =
  process.env['WMS_TEST_DB_USER'] ?? process.env['USER'] ?? 'postgres';
const DB_PASS = process.env['WMS_TEST_DB_PASS'];
const DB_NAME = process.env['WMS_TEST_HOST_DB_NAME'] ?? 'wms_module_host_test';

const resetDatabase = async (): Promise<void> => {
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
    await client.query(`CREATE DATABASE "${DB_NAME}"`);
  } finally {
    await client.end();
  }
};

class Rollback extends Error {
  constructor() {
    super('rollback on purpose');
  }
}

interface StockEventRecord {
  readonly event: string;
  /** consumption change rows visible to a *different* connection at dispatch */
  readonly committedChanges: number;
}

const stockEvents: StockEventRecord[] = [];

/** Not re-exported from core's index; derived from the method instead. */
type CreateTransferOrderItemInput = Parameters<
  TransferOrderService['createTransferOrder']
>[0]['items'][number];

describe('host service layer (integration, no GraphQL)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let entities: WmsEntities;
  let stockService: StockService;
  let batchService: BatchService;
  let transferService: TransferOrderService;
  let receiveService: ReceiveInventoryOrderService;
  let shipService: ShipInventoryOrderService;
  let consumptionService: ConsumptionOrderService;
  let holdService: HoldInventoryOrderService;
  let allocateService: AllocateInventoryOrderService;
  let scrapeService: ScrapeService;
  let loaderService: LoaderService;
  let runner: WmsOperationRunner;

  let shelfId: string;
  let benchId: string;
  let dockId: string;
  let palletTypeId: string;

  let sequence = 0;
  const unique = (label: string): string => `${label}-${(sequence += 1)}`;

  const newMaterial = async (): Promise<{ id: string; key: string }> => {
    const repository = dataSource.getRepository<MaterialEntityClass>(
      entities.material,
    );
    const key = unique('HSL-MAT');
    const saved = await repository.save(
      repository.create({ key } as DeepPartial<MaterialEntityClass>),
    );

    return { id: saved.id, key };
  };

  const newLoader = async (locationId: string): Promise<string> => {
    const [loader] = await loaderService.createLoader({
      typeId: palletTypeId,
      locationId,
      quantity: 1,
    });

    return loader.id;
  };

  /** `quantity` units of a fresh batch on the shelf, committed. */
  const seedStock = async (
    materialId: string,
    quantity: number,
    {
      key = unique('HSL-BATCH'),
      locationId = shelfId,
      loaderId,
      batchId,
    }: {
      key?: string;
      locationId?: string;
      loaderId?: string;
      batchId?: string;
    } = {},
  ): Promise<{ batchId: string; batchKey: string }> => {
    const batch = batchId
      ? await dataSource
          .getRepository<BatchEntityClass>(entities.batch)
          .findOneByOrFail({ id: batchId })
      : await batchService.getBatch({ key, materialId });
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

    return { batchId: batch.id, batchKey: batch.key };
  };

  /** Quantity per status for one material at one location. */
  const byStatus = async (
    materialId: string,
    locationId: string = shelfId,
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

  /** Rows in `stocks`, `loaders` and every `*_order_changes`, read through `manager`. */
  const ledgerCounts = async (
    manager: EntityManager,
  ): Promise<Record<string, number>> => {
    const tables = dataSource.entityMetadatas
      .map((metadata) => metadata.tablePath)
      .filter(
        (table, index, all) =>
          all.indexOf(table) === index &&
          (table.endsWith('_order_changes') ||
            table.endsWith('stocks') ||
            table.endsWith('loaders')),
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

  const transferItems = async (
    orderId: string,
  ): Promise<TransferOrderItemEntityClass[]> =>
    dataSource
      .getRepository<TransferOrderItemEntityClass>(
        transferService.transferOrderItemEntity,
      )
      .find({ where: { orderId } });

  const createTransfer = async (
    materialId: string,
    batchId: string,
    quantity: number,
    manager?: EntityManager,
  ): Promise<{ orderId: string; itemId: string }> => {
    const order = await transferService.createTransferOrder(
      {
        locationId: dockId,
        items: [
          {
            locationId: shelfId,
            materialId,
            batchId,
            targetTransferredQuantity: quantity,
          } as CreateTransferOrderItemInput,
        ],
      },
      manager,
    );
    const items = manager
      ? await manager
          .getRepository<TransferOrderItemEntityClass>(
            transferService.transferOrderItemEntity,
          )
          .find({ where: { orderId: order.id } })
      : await transferItems(order.id);

    return { orderId: order.id, itemId: items[0].id };
  };

  const createReceive = async (
    materialKey: string,
    batchKey: string,
    quantity: number,
    manager?: EntityManager,
  ): Promise<{ orderId: string; itemId: string }> => {
    const order = await receiveService.createReceiveInventoryOrder({
      key: unique('HSL-RCV'),
      description: 'host receive',
      items: [
        {
          serialId: unique('HSL-RCV-LINE'),
          materialKey,
          batchKey,
          locationKey: 'HSL-SHELF',
          targetReceivedQuantity: quantity,
          requireInspection: false,
        },
      ],
      manager,
    });
    const [item] = await (manager ?? dataSource.manager)
      .getRepository<ReceiveInventoryOrderItemEntityClass>(
        receiveService.receiveInventoryOrderItemEntity,
      )
      .find({ where: { orderId: order.id } });

    return { orderId: order.id, itemId: item.id };
  };

  const createShip = async (
    materialId: string,
    batchId: string,
    quantity: number,
    manager?: EntityManager,
  ): Promise<{ orderId: string; itemId: string }> => {
    const run = async (
      m: EntityManager,
    ): Promise<{ orderId: string; itemId: string }> => {
      const order = await shipService.createShipInventoryOrder({
        key: unique('HSL-SHIP'),
        description: 'host ship',
        references: [],
        manager: m,
      });
      await shipService.addShipInventoryOrderItems(
        {
          orderId: order.id,
          items: [
            {
              materialId,
              batchId,
              locationId: shelfId,
              targetShippedQuantity: quantity,
              status: StockStatus.FREE,
              serialId: unique('HSL-SHIP-LINE'),
              orderId: order.id,
            },
          ],
        },
        m,
      );
      const [item] = await m
        .getRepository<ShipInventoryOrderItemEntityClass>(
          shipService.shipInventoryOrderItemEntity,
        )
        .find({ where: { orderId: order.id } });

      return { orderId: order.id, itemId: item.id };
    };

    return manager ? run(manager) : dataSource.transaction(run);
  };

  const createConsumption = async (
    materialId: string,
    batchId: string,
    quantity: number,
    manager?: EntityManager,
  ): Promise<{ orderId: string }> => {
    const order = await consumptionService.createConsumptionOrder(
      {
        description: 'host consumption',
        items: [
          {
            materialId,
            batchId,
            locationId: shelfId,
            targetLocationId: benchId,
            quantity,
          },
        ],
      },
      manager,
    );

    return { orderId: order.id };
  };

  /** The child a hold / allocation split off `parentBatchId`. */
  const childBatch = async (
    parentBatchId: string,
    where: Partial<Pick<BatchEntityClass, 'held'>> | 'allocated',
  ): Promise<string> => {
    const children = await dataSource
      .getRepository<BatchEntityClass>(entities.batch)
      .find({ where: { parentBatchId } });
    const child = children.find((batch) =>
      where === 'allocated' ? batch.saleId !== null : batch.held === where.held,
    );

    if (!child) throw new Error(`no child of ${parentBatchId} matching`);

    return child.id;
  };

  beforeEach(() => {
    stockEvents.length = 0;
  });

  beforeAll(async () => {
    await resetDatabase();

    const recordStockEvent = async (
      context: WmsAfterEventContext,
    ): Promise<void> => {
      // A pooled connection, not the transaction's: it sees only what has
      // been committed. If the flush ran before commit this would read the
      // count from before the issue.
      const [{ count }] = await dataSource.query<[{ count: string }]>(
        `SELECT COUNT(*) AS count FROM "${dataSource.getMetadata(getWmsTablePrefix() + 'consumption_order_changes').tablePath}"`,
      );
      stockEvents.push({
        event: context.event,
        committedChanges: Number(count),
      });
    };

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
          afterListeners: { 'stock.issued': recordStockEvent },
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
    consumptionService = app.get(ConsumptionOrderService);
    holdService = app.get(HoldInventoryOrderService);
    allocateService = app.get(AllocateInventoryOrderService);
    scrapeService = app.get(ScrapeService);
    loaderService = app.get(LoaderService);
    runner = app.get(WmsOperationRunner);

    const locationRepository = dataSource.getRepository<LocationEntityClass>(
      entities.location,
    );
    const newLocation = async (key: string): Promise<string> =>
      (
        await locationRepository.save(
          locationRepository.create({
            key,
            description: key,
            isActive: true,
          } as DeepPartial<LocationEntityClass>),
        )
      ).id;

    shelfId = await newLocation('HSL-SHELF');
    benchId = await newLocation('HSL-BENCH');
    dockId = await newLocation('HSL-DOCK');

    palletTypeId = (
      await loaderService.createLoaderType({
        key: 'HSLP',
        description: 'pallet',
      })
    ).id;
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('B2: every stock-writing method joins the caller transaction', () => {
    interface RollbackCase {
      readonly name: string;
      /** Committed setup; returns the call to make inside the host transaction. */
      readonly prepare: () => Promise<
        (manager: EntityManager) => Promise<unknown>
      >;
      /**
       * What the call changes, read through a manager. Defaults to the ledger
       * row counts; the remove cases only stamp `removedAt`.
       */
      readonly probe?: (manager: EntityManager) => Promise<unknown>;
    }

    const removedAt =
      (table: string, id: () => string) =>
      async (manager: EntityManager): Promise<unknown> => {
        const [row] = await manager.query<[{ removedAt: Date | null }]>(
          `SELECT "removedAt" FROM "${dataSource.getMetadata(getWmsTablePrefix() + table).tablePath}" WHERE id = $1`,
          [id()],
        );

        return row?.removedAt ?? null;
      };

    let removeTarget = '';

    const deallocateCase: RollbackCase = {
      name: 'AllocateInventoryOrderService.deallocate',
      prepare: async () => {
        const material = await newMaterial();
        const { batchId } = await seedStock(material.id, 10);
        await allocateService.createAllocateInventoryOrder({
          items: [
            {
              materialId: material.id,
              batchId,
              locationId: shelfId,
              targetAllocatedQuantity: 3,
              saleId: 'HSL-SO',
              saleSerialId: 'HSL-SO-1',
            },
          ],
        });
        const allocatedId = await childBatch(batchId, 'allocated');

        return (m) =>
          allocateService.deallocate(
            [
              {
                materialId: material.id,
                batchId: allocatedId,
                locationId: shelfId,
                quantity: 3,
              },
            ],
            m,
          );
      },
    };

    const cases: readonly RollbackCase[] = [
      {
        name: 'TransferOrderService.createTransferOrder',
        prepare: async () => {
          const material = await newMaterial();
          const { batchId } = await seedStock(material.id, 10);

          return (m) => createTransfer(material.id, batchId, 3, m);
        },
      },
      {
        name: 'TransferOrderService.transfer',
        prepare: async () => {
          const material = await newMaterial();
          const { batchId } = await seedStock(material.id, 10);
          const { itemId } = await createTransfer(material.id, batchId, 3);

          return (m) => transferService.transfer({ itemId, quantity: 2 }, m);
        },
      },
      {
        name: 'TransferOrderService.cancelTransfer',
        prepare: async () => {
          const material = await newMaterial();
          const { batchId } = await seedStock(material.id, 10);
          const { itemId } = await createTransfer(material.id, batchId, 3);

          return (m) =>
            transferService.cancelTransfer({ itemId, quantity: 3 }, m);
        },
      },
      {
        name: 'TransferOrderService.removeTransferOrder',
        prepare: async () => {
          const material = await newMaterial();
          const { batchId } = await seedStock(material.id, 10);
          const { orderId } = await createTransfer(material.id, batchId, 3);

          return (m) => transferService.removeTransferOrder(orderId, m);
        },
      },
      {
        name: 'ReceiveInventoryOrderService.createReceiveInventoryOrder + receive',
        prepare: async () => {
          const material = await newMaterial();

          return async (m) => {
            const { itemId } = await createReceive(
              material.key,
              unique('HSL-RB'),
              4,
              m,
            );
            await receiveService.receive({ itemId, quantity: 4 }, m);
          };
        },
      },
      {
        name: 'ReceiveInventoryOrderService.receive',
        prepare: async () => {
          const material = await newMaterial();
          const { itemId } = await createReceive(
            material.key,
            unique('HSL-RB'),
            4,
          );

          return (m) => receiveService.receive({ itemId, quantity: 4 }, m);
        },
      },
      {
        name: 'ReceiveInventoryOrderService.removeReceiveInventoryOrder',
        prepare: async () => {
          const material = await newMaterial();
          const { orderId } = await createReceive(
            material.key,
            unique('HSL-RB'),
            4,
          );
          removeTarget = orderId;

          return (m) => receiveService.removeReceiveInventoryOrder(orderId, m);
        },
        probe: removedAt('receive_inventory_orders', () => removeTarget),
      },
      {
        name: 'ShipInventoryOrderService.createShipInventoryOrder + addShipInventoryOrderItems',
        prepare: async () => {
          const material = await newMaterial();
          const { batchId } = await seedStock(material.id, 10);

          return (m) => createShip(material.id, batchId, 3, m);
        },
      },
      {
        name: 'ShipInventoryOrderService.ship',
        prepare: async () => {
          const material = await newMaterial();
          const { batchId } = await seedStock(material.id, 10);
          const { itemId } = await createShip(material.id, batchId, 3);

          return (m) => shipService.ship({ itemId, quantity: 3 }, m);
        },
      },
      {
        name: 'ShipInventoryOrderService.cancelShip',
        prepare: async () => {
          const material = await newMaterial();
          const { batchId } = await seedStock(material.id, 10);
          const { itemId } = await createShip(material.id, batchId, 3);

          return (m) => shipService.cancelShip({ itemId, quantity: 3 }, m);
        },
      },
      {
        name: 'ShipInventoryOrderService.removeShipInventoryOrder',
        prepare: async () => {
          const material = await newMaterial();
          const { batchId } = await seedStock(material.id, 10);
          const { orderId } = await createShip(material.id, batchId, 3);

          return (m) => shipService.removeShipInventoryOrder(orderId, m);
        },
      },
      {
        name: 'ConsumptionOrderService.createConsumptionOrder',
        prepare: async () => {
          const material = await newMaterial();
          const { batchId } = await seedStock(material.id, 10);
          removeTarget = '';

          return async (m) => {
            const { orderId } = await createConsumption(
              material.id,
              batchId,
              3,
              m,
            );
            removeTarget = orderId;
          };
        },
        probe: async (m) =>
          (
            await m.query<[{ count: string }]>(
              `SELECT COUNT(*) AS count FROM "${dataSource.getMetadata(getWmsTablePrefix() + 'consumption_orders').tablePath}"`,
            )
          )[0].count,
      },
      {
        name: 'ConsumptionOrderService.updateConsumptionOrder',
        prepare: async () => {
          const material = await newMaterial();
          const { batchId } = await seedStock(material.id, 10);
          const { orderId } = await createConsumption(material.id, batchId, 3);
          removeTarget = orderId;

          return (m) =>
            consumptionService.updateConsumptionOrder(
              {
                id: orderId,
                description: 'changed inside the host transaction',
              },
              m,
            );
        },
        probe: async (m) =>
          (
            await m.query<[{ description: string }]>(
              `SELECT description FROM "${dataSource.getMetadata(getWmsTablePrefix() + 'consumption_orders').tablePath}" WHERE id = $1`,
              [removeTarget],
            )
          )[0].description,
      },
      {
        name: 'ConsumptionOrderService.removeConsumptionOrder',
        prepare: async () => {
          const material = await newMaterial();
          const { batchId } = await seedStock(material.id, 10);
          const { orderId } = await createConsumption(material.id, batchId, 3);
          removeTarget = orderId;

          return (m) => consumptionService.removeConsumptionOrder(orderId, m);
        },
        probe: removedAt('consumption_orders', () => removeTarget),
      },
      {
        name: 'ConsumptionOrderService.issue',
        prepare: async () => {
          const material = await newMaterial();
          const { batchId } = await seedStock(material.id, 10);
          const { orderId } = await createConsumption(material.id, batchId, 3);

          return (m) => consumptionService.issue({ orderId }, m);
        },
      },
      {
        name: 'ConsumptionOrderService.return',
        prepare: async () => {
          const material = await newMaterial();
          const { batchId } = await seedStock(material.id, 10);
          const { orderId } = await createConsumption(material.id, batchId, 3);
          await consumptionService.issue({ orderId });

          return (m) => consumptionService.return({ orderId }, m);
        },
      },
      {
        name: 'ConsumptionOrderService.settle',
        prepare: async () => {
          const material = await newMaterial();
          const { batchId } = await seedStock(material.id, 10);
          const { orderId } = await createConsumption(material.id, batchId, 3);
          await consumptionService.issue({ orderId });

          return (m) => consumptionService.settle({ orderId }, m);
        },
      },
      {
        name: 'HoldInventoryOrderService.createHoldInventoryOrder',
        prepare: async () => {
          const material = await newMaterial();
          const { batchId } = await seedStock(material.id, 10);

          return (m) =>
            holdService.createHoldInventoryOrder(
              {
                items: [
                  {
                    materialId: material.id,
                    batchId,
                    locationId: shelfId,
                    targetHeldQuantity: 3,
                  },
                ],
              },
              m,
            );
        },
      },
      {
        name: 'HoldInventoryOrderService.release',
        prepare: async () => {
          const material = await newMaterial();
          const { batchId } = await seedStock(material.id, 10);
          await holdService.createHoldInventoryOrder({
            items: [
              {
                materialId: material.id,
                batchId,
                locationId: shelfId,
                targetHeldQuantity: 3,
              },
            ],
          });
          const heldId = await childBatch(batchId, { held: true });

          return (m) =>
            holdService.release(
              [
                {
                  materialId: material.id,
                  batchId: heldId,
                  locationId: shelfId,
                  quantity: 3,
                },
              ],
              m,
            );
        },
      },
      {
        name: 'AllocateInventoryOrderService.createAllocateInventoryOrder',
        prepare: async () => {
          const material = await newMaterial();
          const { batchId } = await seedStock(material.id, 10);

          return (m) =>
            allocateService.createAllocateInventoryOrder(
              {
                items: [
                  {
                    materialId: material.id,
                    batchId,
                    locationId: shelfId,
                    targetAllocatedQuantity: 3,
                    saleId: 'HSL-SO',
                    saleSerialId: 'HSL-SO-1',
                  },
                ],
              },
              m,
            );
        },
      },
      {
        name: 'ScrapeService.scrape',
        prepare: async () => {
          const material = await newMaterial();
          const { batchId } = await seedStock(material.id, 10);

          return (m) =>
            scrapeService.scrape(
              [
                {
                  materialId: material.id,
                  batchId,
                  locationId: shelfId,
                  quantity: 3,
                },
              ],
              m,
            );
        },
      },
      {
        name: 'LoaderService.createLoader',
        prepare: async () => (m) =>
          loaderService.createLoader({
            typeId: palletTypeId,
            locationId: shelfId,
            quantity: 2,
            manager: m,
          }),
      },
    ];

    const rollsBackWithTheHost = async ({
      prepare,
      probe,
    }: RollbackCase): Promise<void> => {
      const call = await prepare();
      const read = probe ?? ledgerCounts;
      const before = await read(dataSource.manager);

      await expect(
        dataSource.transaction(async (manager) => {
          await call(manager);

          // It did write, and on this transaction's connection.
          expect(await read(manager)).not.toEqual(before);

          throw new Rollback();
        }),
      ).rejects.toBeInstanceOf(Rollback);

      // Nothing leaked onto another connection: a write the method made with
      // `this.dataSource` would have committed by itself and still be here.
      expect(await read(dataSource.manager)).toEqual(before);
    };

    it.each(cases)('$name rolls back with the host', rollsBackWithTheHost);

    /*
     * Also the regression guard for deallocate itself: it calls
     * `splitBatch({ saleId: null, saleSerialId: null })` on the allocated
     * batch, and `validateStateTransition` rule 2 used to read clearing the
     * allocation as changing it, so every deallocation threw -- on main too.
     */
    it('AllocateInventoryOrderService.deallocate rolls back with the host', () =>
      rollsBackWithTheHost(deallocateCase));
  });

  describe('events with an outer transaction', () => {
    it('dispatches only after the outermost transaction commits', async () => {
      const material = await newMaterial();
      const { batchId } = await seedStock(material.id, 10);
      const { orderId } = await createConsumption(material.id, batchId, 3);
      const changes = dataSource.getMetadata(
        getWmsTablePrefix() + 'consumption_order_changes',
      ).tablePath;
      const [{ count: beforeCount }] = await dataSource.query<
        [{ count: string }]
      >(`SELECT COUNT(*) AS count FROM "${changes}"`);

      await runner.run({}, () =>
        dataSource.transaction((manager) =>
          consumptionService.issue({ orderId }, manager),
        ),
      );

      expect(stockEvents.map(({ event }) => event)).toEqual(['stock.issued']);
      // Read from another connection inside the listener, so the issue's row
      // was already committed when the event fired.
      expect(stockEvents[0].committedChanges).toBe(Number(beforeCount) + 1);
    });

    it('dispatches nothing when the outer transaction rolls back', async () => {
      const material = await newMaterial();
      const { batchId } = await seedStock(material.id, 10);
      const { orderId } = await createConsumption(material.id, batchId, 3);

      await expect(
        runner.run({}, () =>
          dataSource.transaction(async (manager) => {
            await consumptionService.issue({ orderId }, manager);
            throw new Rollback();
          }),
        ),
      ).rejects.toBeInstanceOf(Rollback);

      expect(stockEvents).toEqual([]);
    });
  });

  describe('B3: concurrent deductions of one batch', () => {
    const backendPid = async (runner: QueryRunner): Promise<number> =>
      (await runner.query(`SELECT pg_backend_pid() AS pid`))[0].pid as number;

    const waitsOnAdvisoryLock = async (pid: number): Promise<boolean> => {
      const [{ waiting }] = await dataSource.query<[{ waiting: boolean }]>(
        `SELECT EXISTS (
           SELECT 1 FROM pg_locks
           WHERE pid = $1 AND locktype = 'advisory' AND NOT granted
         ) AS waiting`,
        [pid],
      );

      return waiting;
    };

    const until = async (
      condition: () => Promise<boolean>,
      timeoutMs = 5000,
    ): Promise<boolean> => {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        if (await condition()) return true;
        await new Promise((resolve) => setTimeout(resolve, 25));
      }

      return false;
    };

    /**
     * Commit one scrape first, so today's order-key sequence exists. Created
     * inside A's transaction instead, B would queue on A's uncommitted
     * `CREATE SEQUENCE` (pg_class) before it ever reached the stock lock --
     * see the sequence note in the report; that is not what this case pins.
     */
    beforeAll(async () => {
      const material = await newMaterial();
      const { batchId } = await seedStock(material.id, 1);
      await scrapeService.scrape([
        { materialId: material.id, batchId, locationId: shelfId, quantity: 1 },
      ]);
    });

    const openTransaction = async (): Promise<QueryRunner> => {
      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      return queryRunner;
    };

    it('the second waits for the first, then sees its deduction and refuses', async () => {
      const material = await newMaterial();
      const { batchId } = await seedStock(material.id, 10);
      const scrape = (manager: EntityManager): Promise<unknown> =>
        scrapeService.scrape(
          [
            {
              materialId: material.id,
              batchId,
              locationId: shelfId,
              quantity: 6,
            },
          ],
          manager,
        );

      const a = await openTransaction();
      const b = await openTransaction();

      try {
        await scrape(a.manager);

        const bPid = await backendPid(b);
        const bResult = scrape(b.manager).then(
          () => 'passed',
          (error: Error) => error.message,
        );

        // Unlocked, B would have read 10 available and passed already.
        expect(await until(() => waitsOnAdvisoryLock(bPid))).toBe(true);

        await a.commitTransaction();

        expect(await bResult).toMatch(/Insufficient stock: available 4/);
        await b.rollbackTransaction();
      } finally {
        if (a.isTransactionActive) await a.rollbackTransaction();
        if (b.isTransactionActive) await b.rollbackTransaction();
        await a.release();
        await b.release();
      }

      expect((await byStatus(material.id))[StockStatus.FREE]).toBe(4);
    });

    it('does not block a deduction of a different batch', async () => {
      const material = await newMaterial();
      const first = await seedStock(material.id, 10);
      const second = await seedStock(material.id, 10);

      const a = await openTransaction();
      const b = await openTransaction();

      try {
        await scrapeService.scrape(
          [
            {
              materialId: material.id,
              batchId: first.batchId,
              locationId: shelfId,
              quantity: 6,
            },
          ],
          a.manager,
        );

        const bDone = scrapeService
          .scrape(
            [
              {
                materialId: material.id,
                batchId: second.batchId,
                locationId: shelfId,
                quantity: 6,
              },
            ],
            b.manager,
          )
          .then(() => true);
        const timedOut = new Promise<boolean>((resolve) =>
          setTimeout(() => resolve(false), 3000),
        );

        // A still holds its lock and has not committed.
        expect(await Promise.race([bDone, timedOut])).toBe(true);

        await a.commitTransaction();
        await b.commitTransaction();
      } finally {
        if (a.isTransactionActive) await a.rollbackTransaction();
        if (b.isTransactionActive) await b.rollbackTransaction();
        await a.release();
        await b.release();
      }

      expect((await byStatus(material.id))[StockStatus.FREE]).toBe(8);
    });

    /*
     * A multi-line operation locks every batch it draws from up front, sorted.
     * Locked line by line, two orders listing the same two batches in opposite
     * order each took one and waited on the other, and PostgreSQL killed one
     * with 40P01. Consumption is the path a host's requisitions take.
     */
    it('two consumption orders naming the same batches in opposite order both issue', async () => {
      const material = await newMaterial();
      const x = await seedStock(material.id, 10);
      const y = await seedStock(material.id, 10);
      const line = (
        batchId: string,
      ): {
        materialId: string;
        batchId: string;
        locationId: string;
        targetLocationId: string;
        quantity: number;
      } => ({
        materialId: material.id,
        batchId,
        locationId: shelfId,
        targetLocationId: benchId,
        quantity: 1,
      });

      for (let round = 0; round < 5; round += 1) {
        const forward = await consumptionService.createConsumptionOrder({
          description: 'forward',
          items: [line(x.batchId), line(y.batchId)],
        });
        const backward = await consumptionService.createConsumptionOrder({
          description: 'backward',
          items: [line(y.batchId), line(x.batchId)],
        });

        const results = await Promise.allSettled(
          [forward.id, backward.id].map((orderId) =>
            dataSource.transaction((manager) =>
              consumptionService.issue({ orderId }, manager),
            ),
          ),
        );

        expect(
          results.map((result) =>
            result.status === 'fulfilled'
              ? 'issued'
              : (result.reason as Error).message,
          ),
        ).toEqual(['issued', 'issued']);
      }
    });

    it('refuses to lock outside a transaction, or a slot it cannot key', async () => {
      const material = await newMaterial();
      const { batchId } = await seedStock(material.id, 1);

      // In autocommit the lock would be released before the sum it guards.
      await expect(
        stockService.lockStockSlots(
          [{ materialId: material.id, batchId }],
          dataSource.manager,
        ),
      ).rejects.toThrow(/must run inside a transaction/);

      // No batch, no key: silently skipping it left the check unlocked.
      await expect(
        dataSource.transaction((manager) =>
          stockService.lockStockSlots(
            [{ materialId: material.id, batchId: null }],
            manager,
          ),
        ),
      ).rejects.toThrow(/needs a materialId and a batchId/);
    });

    /*
     * splitBatch serialises on the batch group, so of two transactions asking
     * for the same state the second waits for the first to commit and finds
     * the sibling it created, instead of both missing it and creating two.
     */
    it('two concurrent splits asking for the same state share one sibling', async () => {
      const material = await newMaterial();
      const { batchId } = await seedStock(material.id, 10);

      const [first, second] = await Promise.all(
        [0, 1].map(() =>
          dataSource.transaction((manager) =>
            batchService.splitBatch({ id: batchId, held: true, manager }),
          ),
        ),
      );

      expect(second.id).toBe(first.id);
      expect(
        await dataSource
          .getRepository<BatchEntityClass>(entities.batch)
          .countBy({ parentBatchId: batchId, held: true }),
      ).toBe(1);
    });
  });

  describe('#183: an unexecuted transfer reservation can be released', () => {
    it('removeTransferOrder returns the reservation to FREE', async () => {
      const material = await newMaterial();
      const { batchId } = await seedStock(material.id, 3);
      const { orderId } = await createTransfer(material.id, batchId, 3);

      const reserved = await byStatus(material.id);
      expect(reserved[StockStatus.FREE] ?? 0).toBe(0);
      expect(reserved[StockStatus.IN_TRANSFER]).toBe(3);

      await expect(transferService.removeTransferOrder(orderId)).resolves.toBe(
        true,
      );

      const after = await byStatus(material.id);
      expect(after[StockStatus.FREE]).toBe(3);
      expect(after[StockStatus.IN_TRANSFER] ?? 0).toBe(0);
    });

    it('cancelTransfer releases the whole reservation', async () => {
      const material = await newMaterial();
      const { batchId } = await seedStock(material.id, 3);
      const { itemId } = await createTransfer(material.id, batchId, 3);

      // Before the fix: "Cancel quantity exceeds pending transfer".
      await expect(
        transferService.cancelTransfer({ itemId, quantity: 3 }),
      ).resolves.toBe(true);

      const after = await byStatus(material.id);
      expect(after[StockStatus.FREE]).toBe(3);
      expect(after[StockStatus.IN_TRANSFER] ?? 0).toBe(0);
    });

    it('after executing 1 of 3, 2 can be cancelled and 3 cannot', async () => {
      const material = await newMaterial();
      const { batchId } = await seedStock(material.id, 3);
      const { itemId } = await createTransfer(material.id, batchId, 3);

      await transferService.transfer({ itemId, quantity: 1 });

      await expect(
        transferService.cancelTransfer({ itemId, quantity: 3 }),
      ).rejects.toThrow(/exceeds pending transfer/);
      await expect(
        transferService.cancelTransfer({ itemId, quantity: 2 }),
      ).resolves.toBe(true);

      const shelf = await byStatus(material.id);
      expect(shelf[StockStatus.FREE]).toBe(2);
      expect(shelf[StockStatus.IN_TRANSFER] ?? 0).toBe(0);
      expect((await byStatus(material.id, dockId))[StockStatus.FREE]).toBe(1);
    });
  });

  describe('#184: a receipt without an inspection state lands on the named batch', () => {
    it('requireInspection: false adds to batch B itself', async () => {
      const material = await newMaterial();
      const { batchId, batchKey } = await seedStock(material.id, 10);
      const { itemId } = await createReceive(material.key, batchKey, 2);

      await receiveService.receive({ itemId, quantity: 2 });

      const [rows] = await stockService.findAggregatedStocks({
        materialId: material.id,
        locationId: shelfId,
      });

      // Before the fix: B stayed at 10 and a child B_<timestamp> held 2.
      expect(rows.map((row) => [row.batchId, Number(row.quantity)])).toEqual([
        [batchId, 12],
      ]);
      expect(
        await dataSource
          .getRepository<BatchEntityClass>(entities.batch)
          .count({ where: { parentBatchId: batchId } }),
      ).toBe(0);
    });

    it('an explicit inspectionResult: true still splits off an inspected child', async () => {
      const material = await newMaterial();
      const { batchId, batchKey } = await seedStock(material.id, 10);
      const { itemId } = await createReceive(material.key, batchKey, 2);

      await receiveService.receive({
        itemId,
        quantity: 2,
        inspectionResult: true,
      });

      const children = await dataSource
        .getRepository<BatchEntityClass>(entities.batch)
        .find({ where: { parentBatchId: batchId } });

      expect(children).toHaveLength(1);
      expect(children[0].inspectionResult).toBe(true);
    });
  });

  describe('#185: loader serials', () => {
    it('never repeat across pooled connections', async () => {
      const { id: typeId } = await loaderService.createLoaderType({
        key: 'HSLZ',
        description: 'Z',
      });
      const a = dataSource.createQueryRunner();
      const b = dataSource.createQueryRunner();

      try {
        await a.connect();
        await b.connect();

        const create = async (runner: QueryRunner): Promise<string[]> =>
          (
            await loaderService.createLoader({
              typeId,
              locationId: shelfId,
              quantity: 3,
              manager: runner.manager,
            })
          ).map(({ serialId }) => serialId);

        // A, B, A: before the fix A's stale CURRVAL reissued B's run.
        const serials = [
          ...(await create(a)),
          ...(await create(b)),
          ...(await create(a)),
        ];

        expect(new Set(serials).size).toBe(9);
      } finally {
        await a.release();
        await b.release();
      }
    });

    it('a first createLoader for a new type works inside a transaction', async () => {
      const { id: typeId } = await loaderService.createLoaderType({
        key: 'HSLX',
        description: 'X',
      });

      // Before the fix: the failed CURRVAL probe aborted the transaction.
      const loaders = await dataSource.transaction((manager) =>
        loaderService.createLoader({
          typeId,
          locationId: shelfId,
          quantity: 2,
          manager,
        }),
      );

      expect(loaders.map(({ serialId }) => serialId)).toEqual([
        'HSLX0001',
        'HSLX0002',
      ]);
    });
  });

  describe('order-key counters', () => {
    /*
     * Probing and creating a sequence need a connection outside the caller's
     * transaction. Borrowing one on every reservation meant a pool full of
     * transactions that each wanted a number starved on the second connection;
     * once a sequence is known to exist, a reservation uses the caller's alone.
     */
    it("borrows a second connection only on a counter's first use", async () => {
      const sequences = app.get(WmsSequenceService);
      const name = `HSL_KNOWN_${Date.now()}`;

      await sequences.reserve(name);

      const outside = jest.spyOn(dataSource, 'query');

      try {
        await dataSource.transaction((manager) =>
          sequences.reserve(name, 1, manager),
        );

        // `manager.query` delegates here too, but hands over its own query
        // runner; only a call without one borrows a connection from the pool.
        expect(
          outside.mock.calls.filter(([, , queryRunner]) => !queryRunner),
        ).toEqual([]);
      } finally {
        outside.mockRestore();
      }
    });

    /*
     * The first use of a counter creates its sequence. Created inside the
     * caller's transaction, it stayed invisible to every other session until
     * that transaction committed, so a second order of the same type that day
     * blocked on the catalog row behind it -- and a rollback dropped the
     * sequence again. Created on a connection of its own, neither happens.
     */
    it('a first use left uncommitted neither blocks a second caller nor vanishes on rollback', async () => {
      const sequences = app.get(WmsSequenceService);
      const name = `HSL_FIRST_${Date.now()}`;
      const a = dataSource.createQueryRunner();
      const b = dataSource.createQueryRunner();

      await a.connect();
      await b.connect();

      try {
        await a.startTransaction();
        await b.startTransaction();
        await b.query(`SET LOCAL lock_timeout = '2s'`);

        const first = await sequences.reserve(name, 1, a.manager);
        const second = await sequences.reserve(name, 1, b.manager);

        expect(second).not.toBe(first);

        await a.rollbackTransaction();
        await b.commitTransaction();

        const [{ exists }] = await dataSource.query<[{ exists: boolean }]>(
          `SELECT to_regclass($1) IS NOT NULL AS "exists"`,
          [`"${getWmsTablePrefix()}${name}"`],
        );

        expect(exists).toBe(true);
      } finally {
        if (a.isTransactionActive) await a.rollbackTransaction();
        if (b.isTransactionActive) await b.rollbackTransaction();
        await a.release();
        await b.release();
      }
    });
  });

  describe('bounded counters', () => {
    /*
     * A bounded reservation is refused before the counter moves. A sequence
     * never rolls back, and a host may catch the error and commit anyway, so
     * checking after the advance left the counter burnt either way.
     */
    it('refuses an out-of-range reservation without moving the counter, even when the caller commits', async () => {
      const sequences = app.get(WmsSequenceService);
      const name = `HSL_BOUND_${Date.now()}`;
      const bound = { maxValue: 5 };

      expect(await sequences.reserve(name, 3, undefined, bound)).toBe(1);

      await dataSource.transaction(async (manager) => {
        await expect(
          sequences.reserve(name, 3, manager, bound),
        ).rejects.toThrow(/SEQUENCE_OUT_OF_RANGE/);
      });

      await expect(
        sequences.reserve(name, 6, undefined, bound),
      ).rejects.toThrow(/SEQUENCE_OUT_OF_RANGE/);
      expect(await sequences.reserve(name, 2, undefined, bound)).toBe(4);
    });
  });

  describe('#186: two items of one batch in one transfer order', () => {
    it('both execute', async () => {
      const material = await newMaterial();
      const palletId = await newLoader(shelfId);
      const targetPalletId = await newLoader(shelfId);
      const { batchId } = await seedStock(material.id, 70);
      await seedStock(material.id, 20, { batchId, loaderId: palletId });

      const order = await transferService.createTransferOrder({
        locationId: shelfId,
        loaderId: targetPalletId,
        items: [
          {
            locationId: shelfId,
            loaderId: palletId,
            materialId: material.id,
            batchId,
            targetTransferredQuantity: 5,
          } as CreateTransferOrderItemInput,
          {
            locationId: shelfId,
            materialId: material.id,
            batchId,
            targetTransferredQuantity: 5,
          } as CreateTransferOrderItemInput,
        ],
      });
      const items = await transferItems(order.id);
      const fromPallet = items.find((item) => item.loaderId === palletId);
      const fromDefault = items.find((item) => item.loaderId !== palletId);
      if (!fromPallet || !fromDefault) throw new Error('missing transfer item');

      await transferService.transfer({ itemId: fromPallet.id, quantity: 5 });
      // Before the fix: "Insufficient stock: available 0, requested 5".
      await transferService.transfer({ itemId: fromDefault.id, quantity: 5 });

      const [rows] = await stockService.findAggregatedStocks({
        materialId: material.id,
        loaderId: targetPalletId,
      });
      expect(rows.reduce((sum, row) => sum + Number(row.quantity), 0)).toBe(10);
      expect((await byStatus(material.id))[StockStatus.IN_TRANSFER] ?? 0).toBe(
        0,
      );
    });

    it('splits in the same millisecond do not collide on the batch key', async () => {
      const material = await newMaterial();
      const { batchId } = await seedStock(material.id, 10);

      const keys = await dataSource.transaction(async (manager) => {
        const split = (): Promise<BatchEntityClass> =>
          batchService.splitBatch({
            id: batchId,
            transferId: randomUUID(),
            manager,
          });
        const results = [
          await split(),
          await split(),
          await split(),
          await split(),
        ];

        return results.map(({ key }) => key);
      });

      expect(new Set(keys).size).toBe(4);
    });
  });
});

/** Keeps the type import used for loader rows honest at compile time. */
export type HostLoaderRow = Pick<LoadersEntityClass, 'serialId'> &
  Pick<LoaderTypeEntityClass, 'key'>;
