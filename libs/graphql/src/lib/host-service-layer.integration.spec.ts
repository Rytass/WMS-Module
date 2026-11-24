import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';
import {
  DataSource,
  type DeepPartial,
  type EntityManager,
  type QueryRunner,
} from 'typeorm';
import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import {
  AllocateInventoryOrderItemEntityClass,
  AllocateInventoryOrderService,
  BatchEntityClass,
  BatchService,
  ConsumptionOrderService,
  HoldInventoryOrderService,
  InventoryCountOrderService,
  MaterialService,
  MaterialUnitEntityClass,
  MergeBatchOrderService,
  QualityInspectionOrderService,
  ReclassifyInventoryOrderService,
  SplitBatchOrderService,
  TransferCustomerOrderService,
  TransferVendorOrderService,
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
  ShipInventoryOrderStatus,
  StockEntityClass,
  StockService,
  StockStatus,
  TransferOrderItemEntityClass,
  TransferOrderService,
  WmsEntities,
  WmsModuleCoreModule,
  WmsOperationRunner,
  type WmsAfterEventContext,
  type WmsModuleCoreModuleOptions,
  WMS_CORE_MODULE_OPTIONS,
  getWmsTablePrefix,
  WmsSequenceService,
} from '@rytass/wms-module-core';

/**
 * A host that uses the services and nothing else.
 *
 * Such a host mounts `WmsModuleCoreModule` without `WmsModuleGraphqlModule` and
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

/** Drop `name` and, unless `recreate` is false, create it empty again. */
const resetDatabase = async (
  name: string = DB_NAME,
  recreate = true,
): Promise<void> => {
  const client = new Client({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASS,
    database: 'postgres',
  });

  await client.connect();

  try {
    await client.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    if (recreate) await client.query(`CREATE DATABASE "${name}"`);
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

/** Every stock event of every name, for the change log consistency checks. */
const allStockEvents: { event: string; changeType: string | null }[] = [];

const recordAnyStockEvent = async (
  context: WmsAfterEventContext,
): Promise<void> => {
  allStockEvents.push({
    event: context.event,
    changeType:
      (context.payload as { changeType: string | null }).changeType ?? null,
  });
};

/**
 * An upgrade statement the integration guide tells hosts to run, read from the
 * guide itself so the guide and the test cannot drift apart.
 */
const guideSql = (marker: string): string => {
  const guide = readFileSync(
    join(__dirname, '../../../core/docs/integration-guide.md'),
    'utf8',
  );
  const block = guide.match(
    new RegExp('```sql\\n(-- ' + marker + '[\\s\\S]*?)```'),
  );

  if (!block) throw new Error(`${marker} not found in the guide`);

  return block[1].replace(/<prefix>/g, getWmsTablePrefix());
};

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
      await recordAnyStockEvent(context);
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
          afterListeners: {
            'stock.issued': recordStockEvent,
            'stock.shipped': recordStockEvent,
            'stock.ship-cancelled': recordStockEvent,
            'stock.transferred': recordStockEvent,
            'stock.transfer-cancelled': recordStockEvent,
            'stock.received': recordAnyStockEvent,
            'stock.in-shipment': recordAnyStockEvent,
            'stock.in-transfer': recordAnyStockEvent,
            'stock.held': recordAnyStockEvent,
            'stock.released': recordAnyStockEvent,
            'stock.allocated': recordAnyStockEvent,
            'stock.deallocated': recordAnyStockEvent,
            'stock.scraped': recordAnyStockEvent,
            'stock.count-gained': recordAnyStockEvent,
            'stock.count-lost': recordAnyStockEvent,
            'stock.returned': recordAnyStockEvent,
            'stock.consumed': recordAnyStockEvent,
          },
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

  describe('#195: ship() validates and locks the in-shipment batch it takes stock from', () => {
    const batchQuantity = async (batchId: string): Promise<number> => {
      const [{ total }] = await dataSource.query<[{ total: string }]>(
        `SELECT COALESCE(SUM(quantity), 0) AS total FROM "${dataSource.getMetadata(entities.stock).tablePath}" WHERE "batchId" = $1`,
        [batchId],
      );

      return Number(total);
    };

    const inShipmentChild = async (batchId: string): Promise<string> => {
      const child = await dataSource
        .getRepository<BatchEntityClass>(entities.batch)
        .findOneByOrFail({ parentBatchId: batchId, inShipment: true });

      return child.id;
    };

    it("ships a line prepared in full, which the item's own batch can no longer cover", async () => {
      const material = await newMaterial();
      const { batchId } = await seedStock(material.id, 100);
      const { itemId } = await createShip(material.id, batchId, 100);
      const childId = await inShipmentChild(batchId);

      expect(await batchQuantity(batchId)).toBe(0);
      expect(await batchQuantity(childId)).toBe(100);

      await expect(
        dataSource.transaction((manager) =>
          shipService.ship({ itemId, quantity: 100 }, manager),
        ),
      ).resolves.toBe(true);

      expect(await batchQuantity(childId)).toBe(0);
      expect(await batchQuantity(batchId)).toBe(0);
    });

    it('ships a partly prepared line off the in-shipment batch and leaves the original alone', async () => {
      const material = await newMaterial();
      const { batchId } = await seedStock(material.id, 100);
      const { itemId } = await createShip(material.id, batchId, 60);
      const childId = await inShipmentChild(batchId);

      await dataSource.transaction((manager) =>
        shipService.ship({ itemId, quantity: 60 }, manager),
      );

      expect(await batchQuantity(childId)).toBe(0);
      expect(await batchQuantity(batchId)).toBe(40);
    });

    it('refuses to ship more than the in-shipment batch still holds', async () => {
      const material = await newMaterial();
      const { batchId } = await seedStock(material.id, 100);
      const { itemId } = await createShip(material.id, batchId, 10);
      const childId = await inShipmentChild(batchId);

      // Someone else drained the shared in-shipment batch down to 2.
      const orderRepository = dataSource.getRepository<OrderEntity>(
        entities.order,
      );
      const drain = await orderRepository.save(orderRepository.create({}));
      await dataSource.getRepository<StockEntityClass>(entities.stock).save({
        orderId: drain.id,
        materialId: material.id,
        batchId: childId,
        locationId: shelfId,
        loaderId: stockService.resolveLoaderId(undefined),
        quantity: -8,
      } as DeepPartial<StockEntityClass>);

      await expect(
        dataSource.transaction((manager) =>
          shipService.ship({ itemId, quantity: 5 }, manager),
        ),
      ).rejects.toThrow(/Insufficient stock: available 2, requested 5/);
      expect(await batchQuantity(childId)).toBe(2);
    });

    it('still refuses to ship over the item target', async () => {
      const material = await newMaterial();
      const { batchId } = await seedStock(material.id, 100);
      const { itemId } = await createShip(material.id, batchId, 10);

      await expect(
        dataSource.transaction((manager) =>
          shipService.ship({ itemId, quantity: 11 }, manager),
        ),
      ).rejects.toThrow(/Shipping quantity exceeds target/);
    });

    it('cancels a prepared quantity back to the original batch', async () => {
      const material = await newMaterial();
      const { batchId } = await seedStock(material.id, 100);
      const { itemId } = await createShip(material.id, batchId, 30);
      const childId = await inShipmentChild(batchId);

      await dataSource.transaction((manager) =>
        shipService.cancelShip({ itemId, quantity: 30 }, manager),
      );

      expect(await batchQuantity(childId)).toBe(0);
      expect(await batchQuantity(batchId)).toBe(100);
    });

    /**
     * The in-shipment child is named by the ledger, not re-derived from the
     * source batch's current attributes. Here a later default receipt lands on a
     * batch that is empty because it was fully prepared, flags it in place
     * (`requiresInspection`), and a sibling lookup by batch state would no
     * longer match the child the reservation created.
     */
    describe('the child survives a later change to the source batch', () => {
      const prepareThenReceiveOntoSource = async (): Promise<{
        materialId: string;
        batchId: string;
        childId: string;
        itemId: string;
        orderId: string;
      }> => {
        const material = await newMaterial();
        const { batchId, batchKey } = await seedStock(material.id, 100);
        const { itemId, orderId } = await createShip(material.id, batchId, 100);
        const childId = await inShipmentChild(batchId);

        const receive = await receiveService.createReceiveInventoryOrder({
          key: unique('HSL-RCV'),
          description: 'late receipt',
          items: [
            {
              serialId: unique('HSL-RCV-LINE'),
              materialKey: material.key,
              batchKey,
              locationKey: 'HSL-SHELF',
              targetReceivedQuantity: 5,
            },
          ],
        });
        const [receiveItem] = await dataSource
          .getRepository<ReceiveInventoryOrderItemEntityClass>(
            receiveService.receiveInventoryOrderItemEntity,
          )
          .find({ where: { orderId: receive.id } });
        await receiveService.receive({ itemId: receiveItem.id, quantity: 5 });

        const source = await dataSource
          .getRepository<BatchEntityClass>(entities.batch)
          .findOneByOrFail({ id: batchId });
        expect(source.requiresInspection).toBe(true);

        return { materialId: material.id, batchId, childId, itemId, orderId };
      };

      it('ship() still finds the prepared child', async () => {
        const { itemId, childId } = await prepareThenReceiveOntoSource();

        await dataSource.transaction((manager) =>
          shipService.ship({ itemId, quantity: 100 }, manager),
        );

        expect(await batchQuantity(childId)).toBe(0);
      });

      it('cancelShip() still finds the prepared child', async () => {
        const { itemId, childId, batchId } =
          await prepareThenReceiveOntoSource();

        await dataSource.transaction((manager) =>
          shipService.cancelShip({ itemId, quantity: 100 }, manager),
        );

        expect(await batchQuantity(childId)).toBe(0);
        expect(await batchQuantity(batchId)).toBe(105);
      });

      it('removeShipInventoryOrder still releases the reservation', async () => {
        const { orderId, childId } = await prepareThenReceiveOntoSource();

        await dataSource.transaction((manager) =>
          shipService.removeShipInventoryOrder(orderId, manager),
        );

        expect(await batchQuantity(childId)).toBe(0);
      });
    });

    /**
     * The collision the lock order exists for: a path that holds the stock lock
     * of the in-shipment child and then wants the batch-group lock (every split
     * does, in that order) against a ship() that would take the group lock first
     * and the child's stock lock second. ship() must queue behind the first.
     */
    it('ship() queues behind a path holding the child stock lock and then splitting the group', async () => {
      const material = await newMaterial();
      const { batchId } = await seedStock(material.id, 100);
      const { itemId } = await createShip(material.id, batchId, 50);
      const childId = await inShipmentChild(batchId);

      let locked!: () => void;
      const childLocked = new Promise<void>((resolve) => (locked = resolve));

      const splitter = dataSource.transaction(async (manager) => {
        await stockService.lockStockSlots(
          [{ materialId: material.id, batchId: childId }],
          manager,
        );
        locked();
        await new Promise((resolve) => setTimeout(resolve, 400));
        await batchService.splitBatch({ id: batchId, held: true, manager });
      });
      await childLocked;
      const shipper = dataSource.transaction((manager) =>
        shipService.ship({ itemId, quantity: 10 }, manager),
      );

      const results = await Promise.allSettled([splitter, shipper]);

      expect(
        results.map((result) =>
          result.status === 'fulfilled'
            ? 'ok'
            : (result.reason as Error).message,
        ),
      ).toEqual(['ok', 'ok']);
    });

    /**
     * ship() and cancelShip() take the stock locks of the source batch *and* the
     * in-shipment child up front, before `splitBatch` would take a batch-group
     * lock. Two transactions reaching the same two batches in opposite order
     * therefore queue instead of each holding one lock and waiting on the other.
     */
    it('two ship calls on the same two batches in opposite order both complete', async () => {
      const material = await newMaterial();
      const x = await seedStock(material.id, 100);
      const y = await seedStock(material.id, 100);

      for (let round = 0; round < 5; round += 1) {
        const [xFirst, yFirst, xSecond, ySecond] = await Promise.all([
          createShip(material.id, x.batchId, 5),
          createShip(material.id, y.batchId, 5),
          createShip(material.id, x.batchId, 5),
          createShip(material.id, y.batchId, 5),
        ]);

        const results = await Promise.allSettled([
          dataSource.transaction((manager) =>
            shipService.ship(
              [
                { itemId: xFirst.itemId, quantity: 1 },
                { itemId: yFirst.itemId, quantity: 1 },
              ],
              manager,
            ),
          ),
          dataSource.transaction((manager) =>
            shipService.ship(
              [
                { itemId: ySecond.itemId, quantity: 1 },
                { itemId: xSecond.itemId, quantity: 1 },
              ],
              manager,
            ),
          ),
          dataSource.transaction((manager) =>
            shipService.cancelShip(
              [
                { itemId: ySecond.itemId, quantity: 1 },
                { itemId: xFirst.itemId, quantity: 1 },
              ],
              manager,
            ),
          ),
        ]);

        expect(
          results.map((result) =>
            result.status === 'fulfilled'
              ? 'ok'
              : (result.reason as Error).message,
          ),
        ).toEqual(['ok', 'ok', 'ok']);
      }
    });
  });

  describe('#195(c): a cancelled shipment is not a shipped one', () => {
    const orderStatus = async (orderId: string): Promise<string> => {
      const [[row]] = await shipService.findMany({ id: orderId });

      return (row as unknown as { status: string }).status;
    };

    const changeTypesOf = async (materialId: string): Promise<string[]> => {
      const [logs] = await stockService.findChangeLogs({ materialId });

      return logs.map(({ changeType }) => changeType as string);
    };

    const changeRows = async (
      orderId: string,
    ): Promise<{ kind: string | null; quantityChanged: number }[]> => {
      const table = dataSource.getMetadata(
        getWmsTablePrefix() + 'ship_inventory_order_changes',
      ).tablePath;
      const itemTable = dataSource.getMetadata(
        shipService.shipInventoryOrderItemEntity,
      ).tablePath;
      const rows = await dataSource.query<
        { kind: string | null; quantityChanged: string }[]
      >(
        `SELECT c.kind, c."quantityChanged" FROM "${table}" c JOIN "${itemTable}" i ON i.id = c."itemId" WHERE i."orderId" = $1 ORDER BY c."quantityChanged" DESC, c.kind`,
        [orderId],
      );

      return rows.map((row) => ({
        kind: row.kind,
        quantityChanged: Number(row.quantityChanged),
      }));
    };

    const prepare = async (
      quantity: number,
    ): Promise<{
      materialId: string;
      batchId: string;
      orderId: string;
      itemId: string;
    }> => {
      const material = await newMaterial();
      const { batchId } = await seedStock(material.id, quantity);
      const { orderId, itemId } = await createShip(
        material.id,
        batchId,
        quantity,
      );

      return { materialId: material.id, batchId, orderId, itemId };
    };

    const cancel = (itemId: string, quantity?: number): Promise<boolean> =>
      runner.run({}, () =>
        dataSource.transaction((manager) =>
          shipService.cancelShip({ itemId, quantity }, manager),
        ),
      );

    const ship = (itemId: string, quantity: number): Promise<boolean> =>
      runner.run({}, () =>
        dataSource.transaction((manager) =>
          shipService.ship({ itemId, quantity }, manager),
        ),
      );

    it('leaves the order pending, logs the cancel and emits stock.ship-cancelled', async () => {
      const { materialId, orderId, itemId } = await prepare(10);

      await cancel(itemId, 4);

      expect(await orderStatus(orderId)).toBe('PENDING');
      expect(await changeTypesOf(materialId)).toContain('SHIP_CANCELLED');
      expect(await changeTypesOf(materialId)).not.toContain('SHIPPED');
      expect(stockEvents.map(({ event }) => event)).toEqual([
        'stock.ship-cancelled',
      ]);
    });

    it('lets the rest ship, completes the order, and refuses one more', async () => {
      const { orderId, itemId } = await prepare(10);

      await cancel(itemId, 4);
      await expect(ship(itemId, 6)).resolves.toBe(true);
      expect(await orderStatus(orderId)).toBe('SHIPPED');
      expect(stockEvents.map(({ event }) => event)).toEqual([
        'stock.ship-cancelled',
        'stock.shipped',
      ]);

      await expect(ship(itemId, 1)).rejects.toThrow(
        /Shipping quantity exceeds target/,
      );
    });

    it('does not report a fully cancelled order as shipped', async () => {
      const { orderId, itemId } = await prepare(10);

      await cancel(itemId);

      expect(await orderStatus(orderId)).toBe('PENDING');
      await expect(ship(itemId, 1)).rejects.toThrow(
        /Shipping quantity exceeds target/,
      );
    });

    it('cancels only what is neither shipped nor already cancelled', async () => {
      const { itemId } = await prepare(10);

      await ship(itemId, 3);
      await cancel(itemId, 2);

      await expect(cancel(itemId, 6)).rejects.toThrow(
        /Cancel quantity exceeds prepared quantity/,
      );
      await expect(cancel(itemId, 5)).resolves.toBe(true);
    });

    it('removes an order by cancelling what is left, whatever came before', async () => {
      const { orderId, itemId } = await prepare(10);

      await ship(itemId, 3);
      await cancel(itemId, 2);
      await dataSource.transaction((manager) =>
        shipService.removeShipInventoryOrder(orderId, manager),
      );

      expect(await orderStatus(orderId)).toBe('REMOVED');
      expect(await changeRows(orderId)).toEqual([
        { kind: 'RESERVE', quantityChanged: 10 },
        { kind: 'CANCEL', quantityChanged: -2 },
        { kind: 'SHIP', quantityChanged: -3 },
        { kind: 'CANCEL', quantityChanged: -5 },
      ]);
    });

    describe('upgrade SQL for rows written before the kind column', () => {
      const backfillSql = (): string =>
        guideSql('wms:ship-change-kind-backfill');

      it('names reserve, ship and cancel rows from the stock rows they wrote', async () => {
        const { orderId, itemId } = await prepare(10);

        await ship(itemId, 3);
        await cancel(itemId, 2);
        await cancel(itemId, 5);

        const before = await changeRows(orderId);
        const table = dataSource.getMetadata(
          getWmsTablePrefix() + 'ship_inventory_order_changes',
        ).tablePath;

        await dataSource.query(
          `UPDATE "${table}" SET kind = NULL WHERE "itemId" = $1`,
          [itemId],
        );
        expect((await changeRows(orderId)).map(({ kind }) => kind)).toEqual([
          null,
          null,
          null,
          null,
        ]);
        expect(await orderStatus(orderId)).toBe('PENDING');

        await dataSource.query(backfillSql());

        expect(await changeRows(orderId)).toEqual(before);
        expect(before.map(({ kind }) => kind)).toEqual([
          'RESERVE',
          'CANCEL',
          'SHIP',
          'CANCEL',
        ]);
      });

      it('refuses to ship or cancel an item whose rows have no kind, until the SQL has run', async () => {
        const { orderId, itemId } = await prepare(10);

        await ship(itemId, 4);

        const table = dataSource.getMetadata(
          getWmsTablePrefix() + 'ship_inventory_order_changes',
        ).tablePath;
        const before = await changeRows(orderId);
        const stocksBefore = await stockService.findChangeLogs({});

        await dataSource.query(
          `UPDATE "${table}" SET kind = NULL WHERE "itemId" = $1`,
          [itemId],
        );

        await expect(ship(itemId, 3)).rejects.toThrow(/without a kind/);
        await expect(cancel(itemId, 3)).rejects.toThrow(/without a kind/);
        await expect(
          dataSource.transaction((manager) =>
            shipService.removeShipInventoryOrder(orderId, manager),
          ),
        ).rejects.toThrow(/without a kind/);
        expect((await stockService.findChangeLogs({}))[1]).toBe(
          stocksBefore[1],
        );

        await dataSource.query(backfillSql());

        expect(await changeRows(orderId)).toEqual(before);
        await expect(ship(itemId, 3)).resolves.toBe(true);
        await expect(cancel(itemId, 3)).resolves.toBe(true);
      });
    });
  });

  describe('#195(c) transfer: a cancelled transfer is not an executed one', () => {
    const changeTypesOf = async (materialId: string): Promise<string[]> => {
      const [logs] = await stockService.findChangeLogs({ materialId });

      return logs.map(({ changeType }) => changeType as string);
    };

    const changeRows = async (
      itemId: string,
    ): Promise<{ kind: string | null; quantityChanged: number }[]> => {
      const table = dataSource.getMetadata(
        getWmsTablePrefix() + 'transfer_order_changes',
      ).tablePath;
      const rows = await dataSource.query<
        { kind: string | null; quantityChanged: string }[]
      >(
        `SELECT kind, "quantityChanged" FROM "${table}" WHERE "itemId" = $1 ORDER BY "quantityChanged" DESC, kind`,
        [itemId],
      );

      return rows.map((row) => ({
        kind: row.kind,
        quantityChanged: Number(row.quantityChanged),
      }));
    };

    const inEvents = <T>(work: () => Promise<T>): Promise<T> =>
      runner.run({}, work);

    it('logs the cancel as TRANSFER_CANCELLED, emits stock.transfer-cancelled, and leaves the rest to execute', async () => {
      const material = await newMaterial();
      const { batchId } = await seedStock(material.id, 5);
      const { itemId } = await createTransfer(material.id, batchId, 5);

      await inEvents(() =>
        transferService.cancelTransfer({ itemId, quantity: 2 }),
      );

      const types = await changeTypesOf(material.id);
      expect(types).toContain('TRANSFER_CANCELLED');
      expect(types).not.toContain('TRANSFERRED');
      expect(stockEvents.map(({ event }) => event)).toEqual([
        'stock.transfer-cancelled',
      ]);

      await expect(
        inEvents(() => transferService.transfer({ itemId, quantity: 3 })),
      ).resolves.toBe(true);
      expect(stockEvents.map(({ event }) => event)).toEqual([
        'stock.transfer-cancelled',
        'stock.transferred',
      ]);
      await expect(
        transferService.transfer({ itemId, quantity: 1 }),
      ).rejects.toThrow(/Transfer quantity exceeds remaining quantity/);
      await expect(
        transferService.cancelTransfer({ itemId, quantity: 1 }),
      ).rejects.toThrow(/exceeds pending transfer/);
    });

    it('a transfer executed in part leaves exactly the rest to cancel', async () => {
      const material = await newMaterial();
      const { batchId } = await seedStock(material.id, 5);
      const { itemId } = await createTransfer(material.id, batchId, 5);

      await transferService.transfer({ itemId, quantity: 3 });
      await expect(
        transferService.cancelTransfer({ itemId, quantity: 3 }),
      ).rejects.toThrow(/exceeds pending transfer/);
      await expect(
        transferService.cancelTransfer({ itemId, quantity: 2 }),
      ).resolves.toBe(true);
    });

    describe('upgrade SQL for rows written before the kind column', () => {
      it('names reserve, transfer and cancel rows from the stock rows they wrote', async () => {
        const material = await newMaterial();
        const { batchId } = await seedStock(material.id, 5);
        const { itemId } = await createTransfer(material.id, batchId, 5);

        await transferService.transfer({ itemId, quantity: 3 });
        await transferService.cancelTransfer({ itemId, quantity: 2 });

        const before = await changeRows(itemId);
        const table = dataSource.getMetadata(
          getWmsTablePrefix() + 'transfer_order_changes',
        ).tablePath;

        expect(before.map(({ kind }) => kind)).toEqual([
          'RESERVE',
          'CANCEL',
          'TRANSFER',
        ]);

        await dataSource.query(
          `UPDATE "${table}" SET kind = NULL WHERE "itemId" = $1`,
          [itemId],
        );
        await dataSource.query(guideSql('wms:transfer-change-kind-backfill'));

        expect(await changeRows(itemId)).toEqual(before);
      });

      it('refuses to transfer or cancel an item whose rows have no kind, until the SQL has run', async () => {
        const material = await newMaterial();
        const { batchId } = await seedStock(material.id, 5);
        const { itemId } = await createTransfer(material.id, batchId, 5);

        await transferService.transfer({ itemId, quantity: 2 });

        const table = dataSource.getMetadata(
          getWmsTablePrefix() + 'transfer_order_changes',
        ).tablePath;
        const before = await changeRows(itemId);
        const logsBefore = (await stockService.findChangeLogs({}))[1];

        await dataSource.query(
          `UPDATE "${table}" SET kind = NULL WHERE "itemId" = $1`,
          [itemId],
        );

        await expect(
          transferService.transfer({ itemId, quantity: 4 }),
        ).rejects.toThrow(/without a kind/);
        await expect(
          transferService.cancelTransfer({ itemId, quantity: 4 }),
        ).rejects.toThrow(/without a kind/);
        expect((await stockService.findChangeLogs({}))[1]).toBe(logsBefore);

        await dataSource.query(guideSql('wms:transfer-change-kind-backfill'));

        expect(await changeRows(itemId)).toEqual(before);
        await expect(
          transferService.transfer({ itemId, quantity: 3 }),
        ).resolves.toBe(true);
      });
    });
  });

  describe('#221: quantities must be greater than 0', () => {
    interface Entry {
      readonly name: string;
      readonly call: (
        quantity: number,
        ids: { materialId: string; batchId: string; itemId: string },
        manager: EntityManager,
      ) => Promise<unknown>;
    }

    const stockLine = (
      ids: { materialId: string; batchId: string },
      quantity: number,
    ): {
      materialId: string;
      batchId: string;
      locationId: string;
      quantity: number;
    } => ({
      materialId: ids.materialId,
      batchId: ids.batchId,
      locationId: shelfId,
      quantity,
    });

    const entries: readonly Entry[] = [
      {
        name: 'ship',
        call: (q, i, m) =>
          shipService.ship({ itemId: i.itemId, quantity: q }, m),
      },
      {
        name: 'cancelShip',
        call: (q, i, m) =>
          shipService.cancelShip({ itemId: i.itemId, quantity: q }, m),
      },
      {
        name: 'addShipInventoryOrderItems',
        call: (q, i, m) =>
          shipService.addShipInventoryOrderItems(
            {
              orderId: i.itemId,
              items: [
                {
                  materialId: i.materialId,
                  batchId: i.batchId,
                  locationId: shelfId,
                  targetShippedQuantity: q,
                  status: StockStatus.FREE,
                  serialId: '1',
                  orderId: i.itemId,
                },
              ],
            },
            m,
          ),
      },
      {
        name: 'createShipInventoryOrder',
        call: (q, _i, m) =>
          shipService.createShipInventoryOrder({
            key: unique('HSL-NEG'),
            description: 'x',
            references: [
              { materialKey: 'x', targetShippedQuantity: q, serialId: '1' },
            ],
            manager: m,
          }),
      },
      {
        name: 'receive',
        call: (q, i, m) =>
          receiveService.receive({ itemId: i.itemId, quantity: q }, m),
      },
      {
        name: 'createReceiveInventoryOrder',
        call: (q, _i, m) =>
          receiveService.createReceiveInventoryOrder({
            key: unique('HSL-NEG'),
            description: 'x',
            items: [
              {
                serialId: '1',
                materialKey: 'x',
                batchKey: 'x',
                targetReceivedQuantity: q,
              },
            ],
            manager: m,
          }),
      },
      {
        name: 'createTransferOrder',
        call: (q, i, m) =>
          transferService.createTransferOrder(
            {
              locationId: dockId,
              items: [
                {
                  locationId: shelfId,
                  materialId: i.materialId,
                  batchId: i.batchId,
                  targetTransferredQuantity: q,
                } as CreateTransferOrderItemInput,
              ],
            },
            m,
          ),
      },
      {
        name: 'updateTransferOrder (new line)',
        call: async (q, i, m) => {
          const order = await transferService.createTransferOrder(
            { locationId: dockId, items: [] },
            m,
          );

          return transferService.updateTransferOrder({
            id: order.id,
            manager: m,
            items: [
              {
                locationId: shelfId,
                materialId: i.materialId,
                batchId: i.batchId,
                targetTransferredQuantity: q,
              } as CreateTransferOrderItemInput,
            ],
          });
        },
      },
      {
        name: 'updateTransferOrder (existing line)',
        call: async (q, i, m) => {
          const order = await transferService.createTransferOrder(
            {
              locationId: dockId,
              items: [
                {
                  locationId: shelfId,
                  materialId: i.materialId,
                  batchId: i.batchId,
                  targetTransferredQuantity: 1,
                } as CreateTransferOrderItemInput,
              ],
            },
            m,
          );
          const [line] = await m
            .getRepository<TransferOrderItemEntityClass>(
              transferService.transferOrderItemEntity,
            )
            .find({ where: { orderId: order.id } });

          return transferService.updateTransferOrder({
            id: order.id,
            manager: m,
            items: [{ id: line.id, targetTransferredQuantity: q }],
          } as Parameters<TransferOrderService['updateTransferOrder']>[0]);
        },
      },
      {
        name: 'updateConsumptionOrder',
        call: async (q, i, m) => {
          const order = await consumptionService.createConsumptionOrder(
            {
              items: [
                {
                  materialId: i.materialId,
                  batchId: i.batchId,
                  quantity: 1,
                  targetLocationId: benchId,
                },
              ],
            },
            m,
          );

          return consumptionService.updateConsumptionOrder(
            {
              id: order.id,
              items: [
                {
                  materialId: i.materialId,
                  batchId: i.batchId,
                  quantity: q,
                  targetLocationId: benchId,
                },
              ],
            },
            m,
          );
        },
      },
      {
        name: 'transfer',
        call: (q, i, m) =>
          transferService.transfer({ itemId: i.itemId, quantity: q }, m),
      },
      {
        name: 'cancelTransfer',
        call: (q, i, m) =>
          transferService.cancelTransfer({ itemId: i.itemId, quantity: q }, m),
      },
      {
        name: 'createHoldInventoryOrder',
        call: (q, i, m) =>
          holdService.createHoldInventoryOrder(
            {
              items: [
                {
                  materialId: i.materialId,
                  batchId: i.batchId,
                  targetHeldQuantity: q,
                },
              ],
            },
            m,
          ),
      },
      {
        name: 'release',
        call: (q, i, m) => holdService.release(stockLine(i, q), m),
      },
      {
        name: 'createAllocateInventoryOrder',
        call: (q, i, m) =>
          allocateService.createAllocateInventoryOrder(
            {
              items: [
                {
                  materialId: i.materialId,
                  batchId: i.batchId,
                  targetAllocatedQuantity: q,
                  saleId: 'S',
                  saleSerialId: '1',
                },
              ],
            } as Parameters<
              AllocateInventoryOrderService['createAllocateInventoryOrder']
            >[0],
            m,
          ),
      },
      {
        name: 'deallocate',
        call: (q, i, m) => allocateService.deallocate(stockLine(i, q), m),
      },
      {
        name: 'split',
        call: (q, i, m) =>
          app.get(SplitBatchOrderService).split(
            {
              batchId: i.batchId,
              items: [{ batchKey: unique('HSL-SPLIT'), quantity: q }],
            },
            m,
          ),
      },
      {
        name: 'merge',
        call: (q, i, m) =>
          app.get(MergeBatchOrderService).merge(
            {
              batchKey: unique('HSL-MERGE'),
              materialId: i.materialId,
              items: [{ batchId: i.batchId, quantity: q }],
            },
            m,
          ),
      },
      {
        name: 'reclassify',
        call: (q, i, m) =>
          app.get(ReclassifyInventoryOrderService).reclassify(
            {
              materialKey: 'x',
              items: [
                { materialId: i.materialId, batchId: i.batchId, quantity: q },
              ],
            },
            m,
          ),
      },
      {
        name: 'scrape',
        call: (q, i, m) =>
          scrapeService.scrape(
            [stockLine(i, q)] as Parameters<ScrapeService['scrape']>[0],
            m,
          ),
      },
      {
        name: 'inspect',
        call: (q, i, m) =>
          app.get(QualityInspectionOrderService).inspect({
            manager: m,
            options: {
              key: unique('HSL-QI'),
              items: [{ ...stockLine(i, q), inspectionResult: true }],
            },
          }),
      },
      {
        name: 'createTransferCustomerOrder',
        call: (q, i, m) =>
          app.get(TransferCustomerOrderService).createTransferCustomerOrder(
            {
              customerId: 'C',
              items: [
                {
                  materialId: i.materialId,
                  batchId: i.batchId,
                  targetTransferredQuantity: q,
                },
              ],
            },
            m,
          ),
      },
      {
        name: 'returnTransferCustomerOrder',
        call: (q, i, m) =>
          app
            .get(TransferCustomerOrderService)
            .returnTransferCustomerOrder(stockLine(i, q), m),
      },
      {
        name: 'createTransferVendorOrder',
        call: (q, i, m) =>
          app.get(TransferVendorOrderService).createTransferVendorOrder(
            {
              vendorId: 'V',
              items: [
                {
                  materialId: i.materialId,
                  batchId: i.batchId,
                  targetTransferredQuantity: q,
                },
              ],
            },
            m,
          ),
      },
      {
        name: 'returnTransferVendorOrder',
        call: (q, i, m) =>
          app
            .get(TransferVendorOrderService)
            .returnTransferVendorOrder(stockLine(i, q), m),
      },
      {
        name: 'createConsumptionOrder',
        call: (q, i, m) =>
          consumptionService.createConsumptionOrder(
            {
              items: [
                {
                  materialId: i.materialId,
                  batchId: i.batchId,
                  quantity: q,
                  targetLocationId: benchId,
                },
              ],
            },
            m,
          ),
      },
      {
        name: 'consumption issue',
        call: (q, i, m) =>
          consumptionService.issue(
            { orderId: i.itemId, items: [{ itemId: i.itemId, quantity: q }] },
            m,
          ),
      },
    ];

    const cases = entries.flatMap((entry) =>
      [-5, 0, Number.NaN].map(
        (quantity) => [entry.name, quantity, entry] as const,
      ),
    );

    it.each(cases)(
      '%s refuses %p and writes nothing',
      async (_name, quantity, entry) => {
        const material = await newMaterial();
        const { batchId } = await seedStock(material.id, 10);
        const ids = { materialId: material.id, batchId, itemId: randomUUID() };
        const before = await dataSource.transaction((m) => ledgerCounts(m));
        const total = async (): Promise<number> =>
          (await byStatus(material.id)).FREE ?? 0;

        await expect(
          dataSource.transaction((manager) =>
            entry.call(quantity, ids, manager),
          ),
        ).rejects.toThrow(/must be a (number greater than 0)|greater than 0/);

        expect(await dataSource.transaction((m) => ledgerCounts(m))).toEqual(
          before,
        );
        expect(await total()).toBe(10);
      },
    );
  });

  describe('#222: consolidating onto a loader at another location', () => {
    const loaderLocation = async (loaderId: string): Promise<string> =>
      (
        await dataSource
          .getRepository(LoadersEntityClass)
          .findOneByOrFail({ id: loaderId })
      ).locationId;

    const consolidate = async (
      materialId: string,
      batchId: string,
      sourceLoaderId: string,
      targetLoaderId: string,
      targetLocationId: string,
      manager?: EntityManager,
    ): Promise<{ id: string }> =>
      transferService.createTransferOrder(
        {
          locationId: targetLocationId,
          loaderId: targetLoaderId,
          items: [
            {
              locationId: shelfId,
              loaderId: sourceLoaderId,
              materialId,
              batchId,
              targetTransferredQuantity: 5,
            } as CreateTransferOrderItemInput,
          ],
        },
        manager,
      );

    it('refuses a target loader that holds stock elsewhere and writes nothing', async () => {
      const material = await newMaterial();
      const target = await newLoader(shelfId);
      const source = await newLoader(shelfId);
      await seedStock(material.id, 10, { loaderId: target });
      const { batchId } = await seedStock(material.id, 5, {
        loaderId: source,
      });
      const before = await dataSource.transaction((m) => ledgerCounts(m));

      await expect(
        dataSource.transaction((m) =>
          consolidate(material.id, batchId, source, target, dockId, m),
        ),
      ).rejects.toThrow(/stock cannot be placed on it there/);

      expect(await dataSource.transaction((m) => ledgerCounts(m))).toEqual(
        before,
      );
      expect(await loaderLocation(target)).toBe(shelfId);
    });

    it('refuses an empty loader elsewhere by default', async () => {
      const material = await newMaterial();
      const target = await newLoader(shelfId);
      const source = await newLoader(shelfId);
      const { batchId } = await seedStock(material.id, 5, {
        loaderId: source,
      });

      await expect(
        consolidate(material.id, batchId, source, target, dockId),
      ).rejects.toThrow(/enable relocateEmptyLoaders/);
      expect(await loaderLocation(target)).toBe(shelfId);
    });

    it('still consolidates onto a loader already at the target location', async () => {
      const material = await newMaterial();
      const target = await newLoader(dockId);
      const source = await newLoader(shelfId);
      await seedStock(material.id, 10, {
        loaderId: target,
        locationId: dockId,
      });
      const { batchId } = await seedStock(material.id, 5, {
        loaderId: source,
      });

      const order = await consolidate(
        material.id,
        batchId,
        source,
        target,
        dockId,
      );
      const [item] = await transferItems(order.id);
      await transferService.transfer({ itemId: item.id, quantity: 5 });

      expect(await loaderLocation(target)).toBe(dockId);
    });

    it('still moves a whole loader to its target location', async () => {
      const material = await newMaterial();
      const loader = await newLoader(shelfId);
      const { batchId } = await seedStock(material.id, 5, { loaderId: loader });

      const order = await transferService.createTransferOrder({
        locationId: dockId,
        loaderId: loader,
        items: [
          {
            locationId: shelfId,
            loaderId: loader,
            materialId: material.id,
            batchId,
            targetTransferredQuantity: 5,
          } as CreateTransferOrderItemInput,
        ],
      });
      const [item] = await transferItems(order.id);
      await transferService.transfer({ itemId: item.id, quantity: 5 });

      expect(await loaderLocation(loader)).toBe(dockId);
    });

    /** Non-zero stock rows of one loader, as `locationId -> quantity`. */
    const loaderStockLocations = async (
      loaderId: string,
    ): Promise<Record<string, number>> => {
      const rows = await dataSource.query<
        { locationId: string; total: string }[]
      >(
        `SELECT "locationId", SUM(quantity) AS total FROM "${dataSource.getMetadata(entities.stock).tablePath}" WHERE "loaderId" = $1 GROUP BY "locationId" HAVING SUM(quantity) <> 0`,
        [loaderId],
      );

      return Object.fromEntries(
        rows.map((row) => [row.locationId, Number(row.total)]),
      );
    };

    it('refuses at execution when the loader moved away after the order was created', async () => {
      const material = await newMaterial();
      const target = await newLoader(shelfId);
      const source = await newLoader(shelfId);
      const { batchId } = await seedStock(material.id, 5, {
        loaderId: source,
      });
      // Passes at creation: the empty target loader is already at the shelf.
      const order = await consolidate(
        material.id,
        batchId,
        source,
        target,
        shelfId,
      );
      const [item] = await transferItems(order.id);

      // Afterwards it goes elsewhere and picks up stock there.
      await dataSource
        .getRepository(LoadersEntityClass)
        .update({ id: target }, { locationId: dockId });
      await seedStock(material.id, 10, {
        loaderId: target,
        locationId: dockId,
      });
      const before = await dataSource.transaction((m) => ledgerCounts(m));

      await expect(
        transferService.transfer({ itemId: item.id, quantity: 5 }),
      ).rejects.toThrow(/stock cannot be placed on it there/);

      expect(await dataSource.transaction((m) => ledgerCounts(m))).toEqual(
        before,
      );
    });

    it('a whole-loader move and a consolidation onto that loader never leave it apart from its stock', async () => {
      const wholeMaterial = await newMaterial();
      const otherMaterial = await newMaterial();
      const pallet = await newLoader(shelfId);
      const feeder = await newLoader(dockId);
      const whole = await seedStock(wholeMaterial.id, 10, { loaderId: pallet });
      const other = await seedStock(otherMaterial.id, 5, {
        loaderId: feeder,
        locationId: dockId,
      });

      const wholeOrder = await transferService.createTransferOrder({
        locationId: dockId,
        loaderId: pallet,
        items: [
          {
            locationId: shelfId,
            loaderId: pallet,
            materialId: wholeMaterial.id,
            batchId: whole.batchId,
            targetTransferredQuantity: 10,
          } as CreateTransferOrderItemInput,
        ],
      });
      // Created while the pallet is still on the shelf, so it passes.
      const mergeOrder = await transferService.createTransferOrder({
        locationId: shelfId,
        loaderId: pallet,
        items: [
          {
            locationId: dockId,
            loaderId: feeder,
            materialId: otherMaterial.id,
            batchId: other.batchId,
            targetTransferredQuantity: 5,
          } as CreateTransferOrderItemInput,
        ],
      });
      const [wholeItem] = await transferItems(wholeOrder.id);
      const [mergeItem] = await transferItems(mergeOrder.id);

      let release!: () => void;
      const hold = new Promise<void>((resolve) => (release = resolve));
      let moved!: () => void;
      const movedFirst = new Promise<void>((resolve) => (moved = resolve));

      const first = dataSource.transaction(async (manager) => {
        await transferService.transfer(
          { itemId: wholeItem.id, quantity: 10 },
          manager,
        );
        moved();
        await hold;
      });
      await movedFirst;
      const second = dataSource.transaction((manager) =>
        transferService.transfer(
          { itemId: mergeItem.id, quantity: 5 },
          manager,
        ),
      );
      // Give the second one the chance to run all its checks while the first
      // still has the pallet's move uncommitted.
      await Promise.race([
        second.catch(() => undefined),
        new Promise((resolve) => setTimeout(resolve, 500)),
      ]);
      release();
      await Promise.allSettled([first, second]);

      const location = await loaderLocation(pallet);
      expect(Object.keys(await loaderStockLocations(pallet))).toEqual([
        location,
      ]);
    });

    describe('a whole-loader item and a consolidation in one order', () => {
      const mixedOrder = async (): Promise<{
        pallet: string;
        wholeItemId: string;
        mergeItemId: string;
      }> => {
        const wholeMaterial = await newMaterial();
        const otherMaterial = await newMaterial();
        const pallet = await newLoader(shelfId);
        const whole = await seedStock(wholeMaterial.id, 10, {
          loaderId: pallet,
        });
        const other = await seedStock(otherMaterial.id, 5);
        const order = await transferService.createTransferOrder({
          locationId: dockId,
          loaderId: pallet,
          items: [
            {
              locationId: shelfId,
              loaderId: pallet,
              materialId: wholeMaterial.id,
              batchId: whole.batchId,
              targetTransferredQuantity: 10,
            } as CreateTransferOrderItemInput,
            {
              locationId: shelfId,
              materialId: otherMaterial.id,
              batchId: other.batchId,
              targetTransferredQuantity: 5,
            } as CreateTransferOrderItemInput,
          ],
        });
        const items = await transferItems(order.id);

        return {
          pallet,
          wholeItemId: items.find(
            ({ materialId }) => materialId === wholeMaterial.id,
          )!.id,
          mergeItemId: items.find(
            ({ materialId }) => materialId === otherMaterial.id,
          )!.id,
        };
      };

      it('can be created, and the whole-loader item must go first', async () => {
        const { wholeItemId, mergeItemId } = await mixedOrder();

        await expect(
          transferService.transfer({ itemId: mergeItemId, quantity: 5 }),
        ).rejects.toThrow(/Whole-loader item must be fully transferred first/);

        await transferService.transfer({ itemId: wholeItemId, quantity: 10 });
        await transferService.transfer({ itemId: mergeItemId, quantity: 5 });
      });

      it('ends with the loader and every row of its stock at the target', async () => {
        const { pallet, wholeItemId, mergeItemId } = await mixedOrder();

        await transferService.transfer({ itemId: wholeItemId, quantity: 10 });
        await transferService.transfer({ itemId: mergeItemId, quantity: 5 });

        expect(await loaderLocation(pallet)).toBe(dockId);
        expect(await loaderStockLocations(pallet)).toEqual({ [dockId]: 15 });
      });
    });

    describe('with relocateEmptyLoaders', () => {
      const relocDb = `${DB_NAME}_reloc`;
      let relocApp: INestApplication;

      beforeAll(async () => {
        await resetDatabase(relocDb);

        relocApp = await Test.createTestingModule({
          imports: [
            TypeOrmModule.forRoot({
              type: 'postgres',
              host: DB_HOST,
              port: DB_PORT,
              username: DB_USER,
              password: DB_PASS,
              database: relocDb,
              autoLoadEntities: true,
              synchronize: true,
              uuidExtension: 'uuid-ossp',
            }),
            WmsModuleCoreModule.forRootAsync({
              useFactory: async () => ({}),
              defaultLoaderSerialId: 'DEFAULT',
              defaultLoaderTypeKey: 'DEFAULT',
              defaultLocationKey: 'DEFAULT',
              relocateEmptyLoaders: true,
            }),
          ],
        })
          .compile()
          .then((moduleRef) => moduleRef.createNestApplication());
        await relocApp.init();
      });

      afterAll(async () => {
        await relocApp?.close();
        await resetDatabase(relocDb, false);
      });

      it('moves an empty loader but still refuses one holding stock', async () => {
        const ds = relocApp.get(DataSource);
        const ents = relocApp.get(WmsEntities);
        const loaders = relocApp.get(LoaderService);
        const batches = relocApp.get(BatchService);
        const stocks = relocApp.get(StockService);
        const transfers = relocApp.get(TransferOrderService);
        const locationRepository = ds.getRepository<LocationEntityClass>(
          ents.location,
        );
        const [a, c] = await Promise.all(
          ['RA', 'RC'].map(
            async (key) =>
              (
                await locationRepository.save(
                  locationRepository.create({
                    key,
                    description: key,
                    isActive: true,
                  } as DeepPartial<LocationEntityClass>),
                )
              ).id,
          ),
        );
        const type = await loaders.createLoaderType({
          key: 'RP',
          description: 'p',
        });
        const [empty, full, source] = await loaders.createLoader({
          typeId: type.id,
          locationId: a,
          quantity: 3,
        });
        const materialRepository = ds.getRepository<MaterialEntityClass>(
          ents.material,
        );
        const material = await materialRepository.save(
          materialRepository.create({
            key: 'RM',
          } as DeepPartial<MaterialEntityClass>),
        );
        const batch = await batches.getBatch({
          key: 'RB',
          materialId: material.id,
        });
        const orders = ds.getRepository<OrderEntity>(ents.order);
        const put = async (
          loaderId: string,
          quantity: number,
        ): Promise<void> => {
          const base = await orders.save(orders.create({}));
          await ds.getRepository<StockEntityClass>(ents.stock).save({
            orderId: base.id,
            materialId: material.id,
            batchId: batch.id,
            locationId: a,
            loaderId,
            quantity,
          } as DeepPartial<StockEntityClass>);
        };
        await put(source.id, 20);
        await put(full.id, 3);

        const make = (targetLoaderId: string): Promise<{ id: string }> =>
          transfers.createTransferOrder({
            locationId: c,
            loaderId: targetLoaderId,
            items: [
              {
                locationId: a,
                loaderId: source.id,
                materialId: material.id,
                batchId: batch.id,
                targetTransferredQuantity: 5,
              } as CreateTransferOrderItemInput,
            ],
          });

        await expect(make(full.id)).rejects.toThrow(/still holds stock/);

        const order = await make(empty.id);
        const items = await ds
          .getRepository<TransferOrderItemEntityClass>(
            transfers.transferOrderItemEntity,
          )
          .find({ where: { orderId: order.id } });
        await transfers.transfer({ itemId: items[0].id, quantity: 5 });

        expect(
          (
            await ds
              .getRepository(LoadersEntityClass)
              .findOneByOrFail({ id: empty.id })
          ).locationId,
        ).toBe(c);
        expect(await stocks.isLoaderEmpty(empty.id, ds.manager)).toBe(false);
      });
    });
  });

  describe('#221: an update cannot smuggle in a line the check skipped', () => {
    const removed = new Date();

    it('ignores a new ship line that carries removedAt with a negative quantity', async () => {
      const material = await newMaterial();
      const { batchId } = await seedStock(material.id, 10);
      const order = await shipService.createShipInventoryOrder({
        key: unique('HSL-UPD'),
        description: 'x',
        references: [],
      });
      const before = await dataSource.transaction((m) => ledgerCounts(m));

      await shipService.updateShipInventoryOrder({
        id: order.id,
        items: [
          {
            materialId: material.id,
            batchId,
            locationId: shelfId,
            targetShippedQuantity: -5,
            status: StockStatus.FREE,
            serialId: '1',
            removedAt: removed,
          },
        ],
      });

      expect(await dataSource.transaction((m) => ledgerCounts(m))).toEqual(
        before,
      );
      expect((await byStatus(material.id)).FREE).toBe(10);
    });

    it('ignores a new receive line that carries removedAt with a negative quantity', async () => {
      const material = await newMaterial();
      const order = await receiveService.createReceiveInventoryOrder({
        key: unique('HSL-UPD'),
        description: 'x',
        items: [],
      });

      await receiveService.updateReceiveInventoryOrder({
        id: order.id,
        items: [
          {
            serialId: '1',
            materialKey: material.key,
            batchKey: unique('HSL-B'),
            targetReceivedQuantity: -5,
            removedAt: removed,
          },
        ],
      });

      const rows = await dataSource
        .getRepository<ReceiveInventoryOrderItemEntityClass>(
          receiveService.receiveInventoryOrderItemEntity,
        )
        .find({ where: { orderId: order.id } });
      expect(rows).toHaveLength(0);
    });

    it('ignores a new allocate line that carries removedAt with a negative quantity', async () => {
      const material = await newMaterial();
      const { batchId } = await seedStock(material.id, 10);
      const order = await allocateService.createAllocateInventoryOrder({
        items: [],
      } as Parameters<
        AllocateInventoryOrderService['createAllocateInventoryOrder']
      >[0]);
      const before = await dataSource.transaction((m) => ledgerCounts(m));

      await allocateService.updateAllocateInventoryOrder({
        id: order.id,
        items: [
          {
            materialId: material.id,
            batchId,
            targetAllocatedQuantity: -5,
            saleId: 'S',
            saleSerialId: '1',
            removedAt: removed,
          },
        ],
      } as Parameters<
        AllocateInventoryOrderService['updateAllocateInventoryOrder']
      >[0]);

      expect(await dataSource.transaction((m) => ledgerCounts(m))).toEqual(
        before,
      );
      expect((await byStatus(material.id)).FREE).toBe(10);
    });

    it('stores only the removal of an existing ship line that also carries a negative quantity', async () => {
      const material = await newMaterial();
      const { batchId } = await seedStock(material.id, 10);
      const { orderId, itemId } = await createShip(material.id, batchId, 4);

      await dataSource.transaction((manager) =>
        shipService.cancelShip({ itemId }, manager),
      );
      await shipService.updateShipInventoryOrder({
        id: orderId,
        items: [
          { id: itemId, removedAt: removed, targetShippedQuantity: -100 },
        ],
      } as Parameters<
        ShipInventoryOrderService['updateShipInventoryOrder']
      >[0]);

      const row = await dataSource
        .getRepository<ShipInventoryOrderItemEntityClass>(
          shipService.shipInventoryOrderItemEntity,
        )
        .findOneByOrFail({ id: itemId });
      expect(Number(row.targetShippedQuantity)).toBe(4);
      expect(row.removedAt).not.toBeNull();
    });

    it('stores only the removal of an existing receive line that also carries a negative quantity', async () => {
      const material = await newMaterial();
      const { orderId, itemId } = await createReceive(
        material.key,
        unique('HSL-B'),
        4,
      );

      await receiveService.updateReceiveInventoryOrder({
        id: orderId,
        items: [
          { id: itemId, removedAt: removed, targetReceivedQuantity: -100 },
        ],
      } as Parameters<
        ReceiveInventoryOrderService['updateReceiveInventoryOrder']
      >[0]);

      const row = await dataSource
        .getRepository<ReceiveInventoryOrderItemEntityClass>(
          receiveService.receiveInventoryOrderItemEntity,
        )
        .findOneByOrFail({ id: itemId });
      expect(Number(row.targetReceivedQuantity)).toBe(4);
      expect(row.removedAt).not.toBeNull();
    });

    it('stores only the removal of an existing allocate line that also carries a negative quantity', async () => {
      const material = await newMaterial();
      const { batchId } = await seedStock(material.id, 10);
      const order = await allocateService.createAllocateInventoryOrder({
        items: [
          {
            materialId: material.id,
            batchId,
            locationId: shelfId,
            targetAllocatedQuantity: 4,
            saleId: 'S',
            saleSerialId: '1',
          },
        ],
      } as Parameters<
        AllocateInventoryOrderService['createAllocateInventoryOrder']
      >[0]);
      const repository =
        dataSource.getRepository<AllocateInventoryOrderItemEntityClass>(
          allocateService.allocateInventoryOrderItemEntity,
        );
      const [line] = await repository.find({ where: { orderId: order.id } });

      await allocateService.updateAllocateInventoryOrder({
        id: order.id,
        items: [
          { id: line.id, removedAt: removed, targetAllocatedQuantity: -100 },
        ],
      } as Parameters<
        AllocateInventoryOrderService['updateAllocateInventoryOrder']
      >[0]);

      const row = await repository.findOneByOrFail({ id: line.id });
      expect(Number(row.targetAllocatedQuantity)).toBe(4);
      expect(row.removedAt).not.toBeNull();
    });

    it('refuses a live new line with a negative quantity on update', async () => {
      const material = await newMaterial();
      const { batchId } = await seedStock(material.id, 10);
      const order = await shipService.createShipInventoryOrder({
        key: unique('HSL-UPD'),
        description: 'x',
        references: [],
      });

      await expect(
        shipService.updateShipInventoryOrder({
          id: order.id,
          items: [
            {
              materialId: material.id,
              batchId,
              targetShippedQuantity: -5,
              status: StockStatus.FREE,
              serialId: '1',
            },
          ],
        }),
      ).rejects.toThrow(/greater than 0/);
    });
  });

  describe('a removed line stays out of the order status', () => {
    const removed = new Date();

    const orderStatus = async (orderId: string): Promise<string> => {
      const [[row]] = await shipService.findMany({ id: orderId });

      return (row as unknown as { status: string }).status;
    };

    // One order, two lines (A and B) with 5 prepared on each.
    const twoLines = async (): Promise<{
      orderId: string;
      itemA: string;
      itemB: string;
    }> => {
      const material = await newMaterial();
      const a = await seedStock(material.id, 5);
      const b = await seedStock(material.id, 5);
      const { orderId, itemId: itemA } = await createShip(
        material.id,
        a.batchId,
        5,
      );
      await dataSource.transaction((manager) =>
        shipService.addShipInventoryOrderItems(
          {
            orderId,
            items: [
              {
                materialId: material.id,
                batchId: b.batchId,
                locationId: shelfId,
                targetShippedQuantity: 5,
                status: StockStatus.FREE,
                serialId: unique('HSL-SHIP-LINE'),
                orderId,
              },
            ],
          },
          manager,
        ),
      );
      const items = await dataSource
        .getRepository<ShipInventoryOrderItemEntityClass>(
          shipService.shipInventoryOrderItemEntity,
        )
        .find({ where: { orderId } });
      const itemB = items.find(({ id }) => id !== itemA);
      if (!itemB) throw new Error('second line missing');

      return { orderId, itemA, itemB: itemB.id };
    };

    const ship = (itemId: string, quantity: number): Promise<boolean> =>
      runner.run({}, () =>
        dataSource.transaction((manager) =>
          shipService.ship({ itemId, quantity }, manager),
        ),
      );

    // A line holding a reservation cannot be removed until it is cancelled.
    const removeLine = async (
      orderId: string,
      itemId: string,
    ): Promise<unknown> => {
      await dataSource.transaction((manager) =>
        shipService.cancelShip({ itemId }, manager),
      );

      return shipService.updateShipInventoryOrder({
        id: orderId,
        items: [{ id: itemId, removedAt: removed }],
      } as Parameters<
        ShipInventoryOrderService['updateShipInventoryOrder']
      >[0]);
    };

    it('is SHIPPED once the remaining line has shipped', async () => {
      const { orderId, itemA, itemB } = await twoLines();

      await ship(itemA, 5);
      await removeLine(orderId, itemB);

      expect(await orderStatus(orderId)).toBe('SHIPPED');
    });

    it('is PARTIAL_SHIPPED while the remaining line is short of its target', async () => {
      const { orderId, itemA, itemB } = await twoLines();

      await ship(itemA, 3);
      await removeLine(orderId, itemB);

      expect(await orderStatus(orderId)).toBe('PARTIAL_SHIPPED');
    });

    it('does not count what a removed line shipped', async () => {
      const { orderId, itemA, itemB } = await twoLines();

      await ship(itemB, 2);
      await removeLine(orderId, itemB);
      expect(await orderStatus(orderId)).toBe('PENDING');

      await ship(itemA, 5);
      expect(await orderStatus(orderId)).toBe('SHIPPED');
    });

    it('is PENDING when every line has been removed', async () => {
      const { orderId, itemA, itemB } = await twoLines();

      await removeLine(orderId, itemA);
      await removeLine(orderId, itemB);

      expect(await orderStatus(orderId)).toBe('PENDING');
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

  describe('D1: order status on a line in a non-base unit', () => {
    // BOX = 12 PCS. A target of 2 BOX is 24 base units; changes are in base units.
    const boxMaterial = async (): Promise<{
      materialId: string;
      materialKey: string;
      boxUnitId: string;
    }> => {
      const key = unique('HSL-BOX-MAT');
      const material = await app.get(MaterialService).createMaterial({
        key,
        description: 'sold by the box',
        baseUnit: 'PCS',
        units: [{ unit: 'BOX', conversionFactor: 12 }],
      });
      const unit = await dataSource
        .getRepository<MaterialUnitEntityClass>(MaterialUnitEntityClass)
        .findOneByOrFail({ materialId: material.id, unit: 'BOX' });

      return { materialId: material.id, materialKey: key, boxUnitId: unit.id };
    };

    const shipStatus = async (orderId: string): Promise<string> => {
      const [[row]] = await shipService.findMany({ id: orderId });

      return (row as unknown as { status: string }).status;
    };

    const receiveStatus = async (orderId: string): Promise<string> => {
      const [[row]] = await receiveService.findMany({ id: orderId });

      return (row as unknown as { status: string }).status;
    };

    const shipTwoBoxes = async (): Promise<{
      orderId: string;
      itemId: string;
    }> => {
      const { materialId, boxUnitId } = await boxMaterial();
      const { batchId } = await seedStock(materialId, 24);
      const order = await dataSource.transaction(async (manager) => {
        const created = await shipService.createShipInventoryOrder({
          key: unique('HSL-SHIP'),
          description: 'boxes',
          references: [],
          manager,
        });
        await shipService.addShipInventoryOrderItems(
          {
            orderId: created.id,
            items: [
              {
                materialId,
                batchId,
                locationId: shelfId,
                unitId: boxUnitId,
                targetShippedQuantity: 2,
                status: StockStatus.FREE,
                serialId: unique('HSL-SHIP-LINE'),
                orderId: created.id,
              },
            ],
          },
          manager,
        );

        return created;
      });
      const [item] = await dataSource
        .getRepository<ShipInventoryOrderItemEntityClass>(
          shipService.shipInventoryOrderItemEntity,
        )
        .find({ where: { orderId: order.id } });

      return { orderId: order.id, itemId: item.id };
    };

    const run = (work: (manager: EntityManager) => Promise<unknown>) =>
      runner.run({}, () => dataSource.transaction(work));

    it('ship: 1 of 2 BOX is PARTIAL_SHIPPED, 2 of 2 is SHIPPED', async () => {
      const { orderId, itemId } = await shipTwoBoxes();

      await run((manager) =>
        shipService.ship({ itemId, quantity: 1 }, manager),
      );
      expect(await shipStatus(orderId)).toBe('PARTIAL_SHIPPED');

      await run((manager) =>
        shipService.ship({ itemId, quantity: 1 }, manager),
      );
      expect(await shipStatus(orderId)).toBe('SHIPPED');
    });

    it('ship: 1 BOX shipped and 1 BOX cancelled is SHIPPED, not PENDING', async () => {
      const { orderId, itemId } = await shipTwoBoxes();

      await run((manager) =>
        shipService.ship({ itemId, quantity: 1 }, manager),
      );
      await run((manager) =>
        shipService.cancelShip({ itemId, quantity: 1 }, manager),
      );

      expect(await shipStatus(orderId)).toBe('SHIPPED');
    });

    it('ship: the status filter agrees with the status column', async () => {
      const { orderId, itemId } = await shipTwoBoxes();

      await run((manager) =>
        shipService.ship({ itemId, quantity: 1 }, manager),
      );

      const [partial] = await shipService.findMany({
        id: orderId,
        status: ShipInventoryOrderStatus.PARTIAL_SHIPPED,
      });
      const [shipped] = await shipService.findMany({
        id: orderId,
        status: ShipInventoryOrderStatus.SHIPPED,
      });

      expect(partial).toHaveLength(1);
      expect(shipped).toHaveLength(0);
    });

    it('receive: 1 of 2 BOX is PARTIAL_RECEIVED, 2 of 2 is RECEIVED', async () => {
      const { materialKey, boxUnitId } = await boxMaterial();
      const order = await receiveService.createReceiveInventoryOrder({
        key: unique('HSL-RCV'),
        description: 'boxes',
        items: [
          {
            serialId: unique('HSL-RCV-LINE'),
            materialKey,
            batchKey: unique('HSL-RCV-BATCH'),
            locationKey: 'HSL-SHELF',
            unitId: boxUnitId,
            targetReceivedQuantity: 2,
            requireInspection: false,
          },
        ],
      });
      const [item] = await dataSource
        .getRepository<ReceiveInventoryOrderItemEntityClass>(
          receiveService.receiveInventoryOrderItemEntity,
        )
        .find({ where: { orderId: order.id } });

      await run((manager) =>
        receiveService.receive({ itemId: item.id, quantity: 1 }, manager),
      );
      expect(await receiveStatus(order.id)).toBe('PARTIAL_RECEIVED');

      await run((manager) =>
        receiveService.receive({ itemId: item.id, quantity: 1 }, manager),
      );
      expect(await receiveStatus(order.id)).toBe('RECEIVED');
    });
  });

  describe('D2: the change log lists every movement the subscriber classifies', () => {
    const inRun = <R>(work: () => Promise<R>): Promise<R> =>
      runner.run({}, work);

    /** Run `work`, then return the change types of its events and of the log. */
    const observe = async (
      materialIds: readonly string[],
      work: () => Promise<void>,
    ): Promise<{ events: string[]; logged: string[] }> => {
      allStockEvents.length = 0;
      await work();

      const logged = (
        await Promise.all(
          materialIds.map(async (materialId) => {
            const [rows] = await stockService.findChangeLogs({ materialId });

            return rows.map(({ changeType }) => changeType as string);
          }),
        )
      ).flat();

      return {
        events: allStockEvents
          .map(({ changeType }) => changeType as string)
          .sort(),
        logged: logged.sort(),
      };
    };

    const sorted = (...types: string[]): string[] => [...types].sort();

    it('receive, ship, transfer, hold, allocate: event and log agree', async () => {
      const material = await newMaterial();

      const { events, logged } = await observe([material.id], async () => {
        const received = await inRun(async () => {
          const { batchKey } = await seedStock(material.id, 0).then(
            async ({ batchKey: key }) => ({ batchKey: key }),
          );

          return createReceive(material.key, batchKey, 4).then(
            async ({ itemId }) => {
              await receiveService.receive({ itemId, quantity: 4 });

              return itemId;
            },
          );
        });

        expect(received).toBeDefined();

        const shipBatch = await seedStock(material.id, 10);
        const ship = await inRun(() =>
          createShip(material.id, shipBatch.batchId, 10),
        );
        await inRun(() =>
          shipService.ship({ itemId: ship.itemId, quantity: 4 }),
        );
        await inRun(() =>
          shipService.cancelShip({ itemId: ship.itemId, quantity: 3 }),
        );

        const transferBatch = await seedStock(material.id, 3);
        const transfer = await inRun(() =>
          createTransfer(material.id, transferBatch.batchId, 3),
        );
        await inRun(() =>
          transferService.transfer({ itemId: transfer.itemId, quantity: 1 }),
        );
        await inRun(() =>
          transferService.cancelTransfer({
            itemId: transfer.itemId,
            quantity: 2,
          }),
        );

        const heldBatch = await seedStock(material.id, 5);
        await inRun(() =>
          holdService.createHoldInventoryOrder({
            items: [
              {
                materialId: material.id,
                batchId: heldBatch.batchId,
                locationId: shelfId,
                targetHeldQuantity: 2,
              },
            ],
          }),
        );
        await inRun(async () =>
          holdService.release([
            {
              materialId: material.id,
              batchId: await childBatch(heldBatch.batchId, { held: true }),
              locationId: shelfId,
              quantity: 2,
            },
          ]),
        );

        const allocated = await seedStock(material.id, 5);
        await inRun(() =>
          allocateService.createAllocateInventoryOrder({
            items: [
              {
                materialId: material.id,
                batchId: allocated.batchId,
                locationId: shelfId,
                targetAllocatedQuantity: 2,
                saleId: 'HSL-D2-SO',
                saleSerialId: 'HSL-D2-SO-1',
              },
            ],
          }),
        );
        await inRun(async () =>
          allocateService.deallocate([
            {
              materialId: material.id,
              batchId: await childBatch(allocated.batchId, 'allocated'),
              locationId: shelfId,
              quantity: 2,
            },
          ]),
        );
      });

      // What the subscriber emitted is the reference; the log must list exactly
      // that. (Release and deallocate are not asserted by name: which type they
      // carry is the subscriber's call, and the log has to follow it.)
      expect(events).toEqual(
        expect.arrayContaining([
          'RECEIVED',
          'IN_SHIPMENT',
          'SHIPPED',
          'SHIP_CANCELLED',
          'IN_TRANSFER',
          'TRANSFERRED',
          'TRANSFER_CANCELLED',
          'HELD',
          'ALLOCATED',
        ]),
      );
      expect(logged).toEqual(events);
    });

    it('scrape: a positive change over a negative stock row is listed as SCRAPED', async () => {
      const material = await newMaterial();
      const { batchId } = await seedStock(material.id, 10);

      const { events, logged } = await observe([material.id], () =>
        inRun(async () => {
          await scrapeService.scrape([
            {
              materialId: material.id,
              batchId,
              locationId: shelfId,
              quantity: 3,
            },
          ]);
        }),
      );

      expect(events).toEqual(['SCRAPED']);
      expect(logged).toEqual(['SCRAPED']);

      const [[row]] = await stockService.findChangeLogs({
        materialId: material.id,
      });

      expect(Number(row.quantity)).toBe(-3);
    });

    it('consumption: issue, return and settle are ISSUED, RETURNED and CONSUMED', async () => {
      const material = await newMaterial();

      const { events, logged } = await observe([material.id], async () => {
        const returned = await seedStock(material.id, 10);
        const { orderId: returnOrder } = await createConsumption(
          material.id,
          returned.batchId,
          10,
        );
        await inRun(() => consumptionService.issue({ orderId: returnOrder }));
        await inRun(() => consumptionService.return({ orderId: returnOrder }));

        const settled = await seedStock(material.id, 10);
        const { orderId: settleOrder } = await createConsumption(
          material.id,
          settled.batchId,
          10,
        );
        await inRun(() => consumptionService.issue({ orderId: settleOrder }));
        await inRun(() => consumptionService.settle({ orderId: settleOrder }));
      });

      expect(events).toEqual(
        sorted('ISSUED', 'RETURNED', 'ISSUED', 'CONSUMED'),
      );
      expect(logged).toEqual(events);
    });

    it('inventory count: a gain and a loss are COUNT_GAINED and COUNT_LOST', async () => {
      const countBayId = (
        await dataSource
          .getRepository<LocationEntityClass>(entities.location)
          .save({
            key: unique('HSL-COUNT-BAY'),
            description: 'count bay',
            isActive: true,
          } as DeepPartial<LocationEntityClass>)
      ).id;
      const lost = await newMaterial();
      const gained = await newMaterial();

      await seedStock(lost.id, 10, { locationId: countBayId });
      await seedStock(gained.id, 10, { locationId: countBayId });

      const countService = app.get(InventoryCountOrderService);

      const { events, logged } = await observe(
        [lost.id, gained.id],
        async () => {
          const order = await countService.create({
            name: unique('HSL-D2-COUNT'),
            countDate: '2026-11-01',
            locationIds: [countBayId],
          });

          await countService.start(order.id);

          const [items] = await countService.findItems(order.id);

          await countService.count(
            order.id,
            items.map((item) => ({
              itemId: item.id,
              countedQuantity:
                Number(item.bookQuantity) +
                (item.materialId === gained.id ? 2 : -2),
            })),
          );
          await inRun(() => countService.settle(order.id));
        },
      );

      expect(events).toEqual(sorted('COUNT_GAINED', 'COUNT_LOST'));
      expect(logged).toEqual(events);
    });

    it('pages over the full set and reports a total that matches', async () => {
      const material = await newMaterial();
      const { batchId } = await seedStock(material.id, 10);
      const { orderId } = await createConsumption(material.id, batchId, 10);

      await inRun(() => consumptionService.issue({ orderId }));
      await inRun(() => consumptionService.settle({ orderId }));
      await inRun(() =>
        scrapeService.scrape([
          {
            materialId: material.id,
            batchId,
            locationId: shelfId,
            quantity: 0.5,
          },
        ]),
      ).catch(() => undefined);

      const [all, total] = await stockService.findChangeLogs({
        materialId: material.id,
      });
      const pages = await Promise.all(
        all.map((_, offset) =>
          stockService.findChangeLogs({
            materialId: material.id,
            offset,
            limit: 1,
          }),
        ),
      );

      expect(total).toBe(all.length);
      expect(total).toBeGreaterThanOrEqual(2);
      expect(pages.map(([[row]]) => row.id).sort()).toEqual(
        all.map(({ id }) => id).sort(),
      );
    });
  });

  describe('D3: merging batches', () => {
    const mergeService = (): MergeBatchOrderService =>
      app.get(MergeBatchOrderService);

    const setBatch = async (
      batchId: string,
      patch: {
        attributes?: Record<string, unknown> | null;
        requiresInspection?: boolean;
      },
    ): Promise<void> => {
      await dataSource
        .getRepository<BatchEntityClass>(entities.batch)
        .update({ id: batchId }, patch as never);
    };

    /** The batch a merge put its stock into: the one holding positive stock. */
    const mergedBatchOf = async (
      materialId: string,
      batchKey: string,
    ): Promise<BatchEntityClass> => {
      const target = await dataSource
        .getRepository<BatchEntityClass>(entities.batch)
        .findOneByOrFail({ materialId, key: batchKey });
      const children = await dataSource
        .getRepository<BatchEntityClass>(entities.batch)
        .find({ where: { parentBatchId: target.id } });

      return children.length === 1 ? children[0] : target;
    };

    const twoBatches = async (
      first: Parameters<typeof setBatch>[1],
      second: Parameters<typeof setBatch>[1],
    ): Promise<{ materialId: string; a: string; b: string }> => {
      const material = await newMaterial();
      const a = await seedStock(material.id, 5);
      const b = await seedStock(material.id, 5);

      await setBatch(a.batchId, first);
      await setBatch(b.batchId, second);

      return { materialId: material.id, a: a.batchId, b: b.batchId };
    };

    const merge = (
      materialId: string,
      batchKey: string,
      batchIds: readonly string[],
    ): Promise<unknown> =>
      mergeService().merge({
        batchKey,
        materialId,
        items: batchIds.map((batchId) => ({
          batchId,
          locationId: shelfId,
          quantity: 5,
        })),
      });

    it('merges a batch that sits at two locations', async () => {
      const material = await newMaterial();
      const first = await seedStock(material.id, 5);
      await seedStock(material.id, 4, {
        batchId: first.batchId,
        locationId: benchId,
      });

      await mergeService().merge({
        batchKey: unique('HSL-MERGED'),
        materialId: material.id,
        items: [
          { batchId: first.batchId, locationId: shelfId, quantity: 5 },
          { batchId: first.batchId, locationId: benchId, quantity: 4 },
        ],
      });

      const shelf = await byStatus(material.id, shelfId);
      const bench = await byStatus(material.id, benchId);

      expect(shelf[StockStatus.FREE]).toBe(5);
      expect(bench[StockStatus.FREE]).toBe(4);
      // The source batch is emptied at both places.
      const [rows] = await stockService.findAggregatedStocks({
        materialId: material.id,
        batchId: first.batchId,
      });

      expect(rows.reduce((sum, row) => sum + Number(row.quantity), 0)).toBe(0);
    });

    it('refuses batches whose attributes differ, and writes nothing', async () => {
      const { materialId, a, b } = await twoBatches(
        { attributes: { grade: 'A' } },
        { attributes: { grade: 'B' } },
      );
      const before = await dataSource.transaction((m) => ledgerCounts(m));

      await expect(
        merge(materialId, unique('HSL-MERGED'), [a, b]),
      ).rejects.toThrow(/attributes/);
      expect(await dataSource.transaction((m) => ledgerCounts(m))).toEqual(
        before,
      );
    });

    it('refuses a batch with attributes against one without', async () => {
      const { materialId, a, b } = await twoBatches(
        { attributes: { grade: 'A' } },
        { attributes: null },
      );

      await expect(
        merge(materialId, unique('HSL-MERGED'), [a, b]),
      ).rejects.toThrow(/attributes/);
    });

    it('refuses batches that differ in requiresInspection', async () => {
      const { materialId, a, b } = await twoBatches(
        { requiresInspection: true },
        { requiresInspection: false },
      );

      await expect(
        merge(materialId, unique('HSL-MERGED'), [a, b]),
      ).rejects.toThrow(/requiresInspection/);
    });

    it('compares attributes by content, not by key order', async () => {
      const { materialId, a, b } = await twoBatches(
        { attributes: { grade: 'A', bin: 'B1', nested: { x: 1, y: 2 } } },
        { attributes: { nested: { y: 2, x: 1 }, bin: 'B1', grade: 'A' } },
      );

      await expect(
        merge(materialId, unique('HSL-MERGED'), [a, b]),
      ).resolves.toBeDefined();
    });

    it('carries attributes and requiresInspection onto the merged batch', async () => {
      const { materialId, a, b } = await twoBatches(
        { attributes: { grade: 'A' }, requiresInspection: true },
        { attributes: { grade: 'A' }, requiresInspection: true },
      );
      const key = unique('HSL-MERGED');

      await merge(materialId, key, [a, b]);

      const merged = await mergedBatchOf(materialId, key);

      expect(merged.attributes).toEqual({ grade: 'A' });
      expect(merged.requiresInspection).toBe(true);
    });
  });

  describe('D4: removing a ship line that still holds a reservation', () => {
    const coreOptions = (): WmsModuleCoreModuleOptions =>
      app.get<WmsModuleCoreModuleOptions>(WMS_CORE_MODULE_OPTIONS);

    const withOption = async (
      value: boolean,
      work: () => Promise<void>,
    ): Promise<void> => {
      const options = coreOptions();
      const before = options.cancelReservationOnShipLineRemoval;

      options.cancelReservationOnShipLineRemoval = value;

      try {
        await work();
      } finally {
        options.cancelReservationOnShipLineRemoval = before;
      }
    };

    const removeLine = (orderId: string, itemId: string): Promise<unknown> =>
      shipService.updateShipInventoryOrder({
        id: orderId,
        items: [{ id: itemId, removedAt: new Date() }],
      } as Parameters<
        ShipInventoryOrderService['updateShipInventoryOrder']
      >[0]);

    const prepare = async (
      quantity: number,
    ): Promise<{
      materialId: string;
      orderId: string;
      itemId: string;
    }> => {
      const material = await newMaterial();
      const { batchId } = await seedStock(material.id, quantity);
      const { orderId, itemId } = await createShip(
        material.id,
        batchId,
        quantity,
      );

      return { materialId: material.id, orderId, itemId };
    };

    const lineRemovedAt = async (itemId: string): Promise<Date | null> =>
      (
        await dataSource
          .getRepository<ShipInventoryOrderItemEntityClass>(
            shipService.shipInventoryOrderItemEntity,
          )
          .findOneByOrFail({ id: itemId })
      ).removedAt ?? null;

    it('is off unless a deployment turns it on', () => {
      expect(coreOptions().cancelReservationOnShipLineRemoval).toBeFalsy();
    });

    it('refuses by default, names the line, and writes nothing', async () => {
      const { materialId, orderId, itemId } = await prepare(5);
      const before = await dataSource.transaction((m) => ledgerCounts(m));

      await expect(removeLine(orderId, itemId)).rejects.toThrow(
        /still holds 5 reserved.*cancelShip/,
      );

      expect(await dataSource.transaction((m) => ledgerCounts(m))).toEqual(
        before,
      );
      expect(await lineRemovedAt(itemId)).toBeNull();
      expect((await byStatus(materialId))[StockStatus.IN_SHIPMENT]).toBe(5);
    });

    it('refuses a partly shipped line for what is left of it', async () => {
      const { orderId, itemId } = await prepare(5);

      await runner.run({}, () =>
        dataSource.transaction((manager) =>
          shipService.ship({ itemId, quantity: 2 }, manager),
        ),
      );

      await expect(removeLine(orderId, itemId)).rejects.toThrow(
        /still holds 3 reserved/,
      );
    });

    it('removes the line once cancelShip has released it', async () => {
      const { materialId, orderId, itemId } = await prepare(5);

      await dataSource.transaction((manager) =>
        shipService.cancelShip({ itemId }, manager),
      );
      await removeLine(orderId, itemId);

      expect(await lineRemovedAt(itemId)).not.toBeNull();
      expect((await byStatus(materialId))[StockStatus.FREE]).toBe(5);
    });

    it('removes a line that has shipped in full', async () => {
      const { orderId, itemId } = await prepare(5);

      await runner.run({}, () =>
        dataSource.transaction((manager) =>
          shipService.ship({ itemId, quantity: 5 }, manager),
        ),
      );
      await removeLine(orderId, itemId);

      expect(await lineRemovedAt(itemId)).not.toBeNull();
    });

    it('removes a line that never had a reservation', async () => {
      const { orderId, itemId } = await prepare(5);

      await dataSource.transaction((manager) =>
        shipService.cancelShip({ itemId }, manager),
      );

      await expect(removeLine(orderId, itemId)).resolves.toBeDefined();
    });

    it('with cancelReservationOnShipLineRemoval, cancels what is left and returns it to the batch', async () => {
      const { materialId, orderId, itemId } = await prepare(5);

      await withOption(true, async () => {
        await runner.run({}, () =>
          dataSource.transaction((manager) =>
            shipService.ship({ itemId, quantity: 2 }, manager),
          ),
        );
        await removeLine(orderId, itemId);
      });

      const free = await byStatus(materialId);

      expect(await lineRemovedAt(itemId)).not.toBeNull();
      expect(free[StockStatus.FREE]).toBe(3);
      expect(free[StockStatus.IN_SHIPMENT] ?? 0).toBe(0);

      const [changes] = await dataSource
        .query<
          { kind: string; quantityChanged: string }[][]
        >(`SELECT c.kind, c."quantityChanged" FROM "${dataSource.getMetadata(getWmsTablePrefix() + 'ship_inventory_order_changes').tablePath}" c WHERE c."itemId" = $1 AND c.kind = 'CANCEL'`, [itemId])
        .then((rows) => [rows]);

      expect(changes.map((row) => Number(row.quantityChanged))).toEqual([-3]);
    });

    it('with the option on, a line without a reservation is removed as usual', async () => {
      const { orderId, itemId } = await prepare(5);

      await dataSource.transaction((manager) =>
        shipService.cancelShip({ itemId }, manager),
      );
      const before = await dataSource.transaction((m) => ledgerCounts(m));

      await withOption(true, async () => {
        await removeLine(orderId, itemId);
      });

      expect(await dataSource.transaction((m) => ledgerCounts(m))).toEqual(
        before,
      );
      expect(await lineRemovedAt(itemId)).not.toBeNull();
    });

    it('with the option on, the cancel and the removal commit or roll back together', async () => {
      const { materialId, orderId, itemId } = await prepare(5);

      await withOption(true, async () => {
        await expect(
          dataSource.transaction(async (manager) => {
            await shipService.updateShipInventoryOrder({
              id: orderId,
              items: [{ id: itemId, removedAt: new Date() }],
              manager,
            } as Parameters<
              ShipInventoryOrderService['updateShipInventoryOrder']
            >[0]);

            throw new Rollback();
          }),
        ).rejects.toThrow(Rollback);
      });

      expect(await lineRemovedAt(itemId)).toBeNull();
      expect((await byStatus(materialId))[StockStatus.IN_SHIPMENT]).toBe(5);
    });

    it('removing the whole order releases a line removed earlier with its reservation still standing', async () => {
      const { materialId, orderId, itemId } = await prepare(5);

      // A line removed before the rule existed: stamped, reservation left.
      await dataSource
        .getRepository<ShipInventoryOrderItemEntityClass>(
          shipService.shipInventoryOrderItemEntity,
        )
        .update({ id: itemId }, { removedAt: new Date() } as never);
      expect((await byStatus(materialId))[StockStatus.IN_SHIPMENT]).toBe(5);

      await dataSource.transaction((manager) =>
        shipService.removeShipInventoryOrder(orderId, manager),
      );

      const after = await byStatus(materialId);

      expect(after[StockStatus.FREE]).toBe(5);
      expect(after[StockStatus.IN_SHIPMENT] ?? 0).toBe(0);
    });

    it('forRootAsync hands the option to the providers', () => {
      const provider = (
        WmsModuleCoreModule.forRootAsync({
          useFactory: async () => ({}),
          defaultLoaderSerialId: 'DEFAULT',
          defaultLoaderTypeKey: 'DEFAULT',
          defaultLocationKey: 'DEFAULT',
          cancelReservationOnShipLineRemoval: true,
        }).providers ?? []
      ).find(
        (candidate) =>
          typeof candidate === 'object' &&
          'provide' in candidate &&
          candidate.provide === WMS_CORE_MODULE_OPTIONS,
      );

      expect(provider).toMatchObject({
        useValue: { cancelReservationOnShipLineRemoval: true },
      });
    });
  });

  describe('conversion factors must be finite and greater than 0', () => {
    const service = (): MaterialService => app.get(MaterialService);
    const badFactors: readonly number[] = [
      0,
      -3,
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ];
    const unitCount = async (key: string): Promise<number> => {
      const material = await dataSource
        .getRepository(MaterialEntityClass)
        .findOneBy({ key });

      return material
        ? dataSource
            .getRepository(MaterialUnitEntityClass)
            .countBy({ materialId: material.id })
        : 0;
    };

    it.each(badFactors)('createMaterial refuses %p', async (factor) => {
      const key = unique('HSL-CF-C');

      await expect(
        service().createMaterial({
          key,
          description: 'bad factor',
          baseUnit: 'PCS',
          units: [{ unit: 'BOX', conversionFactor: factor }],
        }),
      ).rejects.toThrow(/BOX.*conversionFactor|conversionFactor.*BOX/);
      expect(await unitCount(key)).toBe(0);
    });

    it.each(badFactors)(
      'updateMaterial refuses %p on a new and on an existing unit',
      async (factor) => {
        const material = await service().createMaterial({
          key: unique('HSL-CF-U'),
          description: 'good',
          baseUnit: 'PCS',
          units: [{ unit: 'BOX', conversionFactor: 12 }],
        });

        await expect(
          service().updateMaterial({
            id: material.id,
            units: [{ unit: 'CASE', conversionFactor: factor }],
          }),
        ).rejects.toThrow(/CASE/);
        await expect(
          service().updateMaterial({
            id: material.id,
            units: [{ unit: 'BOX', conversionFactor: factor }],
          }),
        ).rejects.toThrow(/BOX/);

        const [box] = await dataSource
          .getRepository(MaterialUnitEntityClass)
          .findBy({ materialId: material.id, unit: 'BOX' });

        expect(Number(box.conversionFactor)).toBe(12);
        expect(await unitCount(material.key)).toBe(1);
      },
    );

    it('a positive factor, fractional included, still works', async () => {
      const material = await service().createMaterial({
        key: unique('HSL-CF-OK'),
        description: 'good',
        baseUnit: 'PCS',
        units: [{ unit: 'BOX', conversionFactor: 12 }],
      });
      await service().updateMaterial({
        id: material.id,
        units: [
          { unit: 'BOX', conversionFactor: 24 },
          { unit: 'HALF', conversionFactor: 0.5 },
        ],
      });
      const units = await dataSource
        .getRepository(MaterialUnitEntityClass)
        .findBy({ materialId: material.id });
      const byUnit = new Map(
        units.map((u) => [u.unit, Number(u.conversionFactor)]),
      );

      expect(byUnit.get('BOX')).toBe(24);
      expect(byUnit.get('HALF')).toBe(0.5);
      expect(
        await service().getConversionFactor(
          material.id,
          units.find((u) => u.unit === 'BOX')?.id,
        ),
      ).toBe(24);
    });

    it.each(['0', '-2', "'NaN'", "'Infinity'"])(
      'a stored value of %s makes a converting operation throw',
      async (stored) => {
        const material = await service().createMaterial({
          key: unique('HSL-CF-R'),
          description: 'poisoned',
          baseUnit: 'PCS',
          units: [{ unit: 'BOX', conversionFactor: 12 }],
        });
        const unit = await dataSource
          .getRepository(MaterialUnitEntityClass)
          .findOneByOrFail({ materialId: material.id, unit: 'BOX' });
        await dataSource.query(
          `UPDATE "${dataSource.getMetadata(MaterialUnitEntityClass).tableName}" SET "conversionFactor" = ${stored} WHERE id = $1`,
          [unit.id],
        );
        const { batchId } = await seedStock(material.id, 24);

        await expect(
          scrapeService.scrape([
            {
              materialId: material.id,
              batchId,
              locationId: shelfId,
              unitId: unit.id,
              quantity: 1,
            },
          ]),
        ).rejects.toThrow(/conversionFactor/);
        await expect(
          service().getConversionFactor(material.id, unit.id),
        ).rejects.toThrow(/conversionFactor/);
      },
    );
  });
});

/** Keeps the type import used for loader rows honest at compile time. */
export type HostLoaderRow = Pick<LoadersEntityClass, 'serialId'> &
  Pick<LoaderTypeEntityClass, 'key'>;
