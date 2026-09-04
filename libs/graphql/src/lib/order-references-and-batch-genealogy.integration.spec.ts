import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GraphQLModule, GraphQLSchemaHost } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from 'pg';
import { DataSource, type DeepPartial } from 'typeorm';
import { ExecutionResult, GraphQLSchema, graphql } from 'graphql';
import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import {
  BatchEntityClass,
  BatchService,
  LocationEntityClass,
  MaterialEntityClass,
  OrderReferenceService,
  SplitBatchOrderService,
  StockEntityClass,
  StockService,
  WmsEntities,
  WmsOrderType,
} from '@rytass/wms-module-core';
import { WmsModuleGraphqlModule } from './graphql.module';
import { LoaderService, createWmsLoaders } from './helpers';

/**
 * The four things a host needs before it can drive this warehouse from its own
 * documents, none of which the module had:
 *
 * 1. **`batches.parentBatchId`** — every status here is a flag on the batch, so
 *    acting on *part* of one splits a child off first. Those children used to be
 *    orphans; the only route back to the original batch was the stock ledger.
 * 2. **`batches.attributes`** — a `batchEntity` override can already add columns,
 *    but the module cannot see them, so it cannot carry them through a split.
 * 3. **`excludeLocationIds`** — a stock report has to be able to drop locations
 *    that do not represent available inventory. Subtractive, because `locationId`
 *    narrows to exactly one.
 * 4. **`order_references`** — orders record what moved and when, never what for.
 *
 * Requires a reachable PostgreSQL; override with WMS_TEST_DB_* env vars.
 */
const DB_HOST = process.env['WMS_TEST_DB_HOST'] ?? 'localhost';
const DB_PORT = Number(process.env['WMS_TEST_DB_PORT'] ?? 5432);
const DB_USER =
  process.env['WMS_TEST_DB_USER'] ?? process.env['USER'] ?? 'postgres';
const DB_PASS = process.env['WMS_TEST_DB_PASS'];
const DB_NAME =
  process.env['WMS_TEST_ORDER_REFERENCE_DB_NAME'] ??
  'wms_module_order_reference_test';

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

describe('order references and batch genealogy (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let entities: WmsEntities;
  let stockService: StockService;
  let batchService: BatchService;
  let splitBatchOrderService: SplitBatchOrderService;
  let orderReferenceService: OrderReferenceService;
  let schema: GraphQLSchema;
  let loaderService: LoaderService;

  let materialId: string;
  let storageLocationId: string;
  let wipLocationId: string;
  let sourceBatchId: string;

  const execute = async (
    source: string,
  ): Promise<ExecutionResult<Record<string, unknown>>> =>
    graphql({
      schema,
      source,
      contextValue: { ...createWmsLoaders(loaderService) },
    }) as Promise<ExecutionResult<Record<string, unknown>>>;

  /** Seed a stock position without going through an order service. */
  const seedStock = async (
    batchId: string,
    locationId: string,
    quantity: number,
  ): Promise<void> => {
    const orderRepository = dataSource.getRepository<OrderEntity>(
      entities.order,
    );
    const baseOrder = await orderRepository.save(orderRepository.create({}));

    await dataSource.getRepository<StockEntityClass>(entities.stock).save({
      orderId: baseOrder.id,
      materialId,
      batchId,
      locationId,
      loaderId: stockService.resolveLoaderId(null),
      quantity,
    } as never);
  };

  const readBatch = async (id: string): Promise<BatchEntityClass> =>
    dataSource
      .getRepository<BatchEntityClass>(entities.batch)
      .findOneByOrFail({ id });

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
        }),
        GraphQLModule.forRootAsync({
          driver: ApolloDriver,
          inject: [LoaderService],
          useFactory: (injected: LoaderService) => ({
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
    splitBatchOrderService = app.get(SplitBatchOrderService);
    orderReferenceService = app.get(OrderReferenceService);
    schema = app.get(GraphQLSchemaHost).schema;
    loaderService = app.get(LoaderService);

    const locationRepository = dataSource.getRepository<LocationEntityClass>(
      entities.location,
    );

    const storage = await locationRepository.save(
      locationRepository.create({
        key: 'REF-STORAGE',
        description: 'storage',
        isActive: true,
      } as DeepPartial<LocationEntityClass>),
    );
    storageLocationId = storage.id;

    const wip = await locationRepository.save(
      locationRepository.create({
        key: 'REF-WIP',
        description: 'work in progress',
        isActive: true,
      } as DeepPartial<LocationEntityClass>),
    );
    wipLocationId = wip.id;

    const materialRepository = dataSource.getRepository<MaterialEntityClass>(
      entities.material,
    );
    const material = await materialRepository.save(
      materialRepository.create({
        key: 'REF-MATERIAL',
      } as DeepPartial<MaterialEntityClass>),
    );
    materialId = material.id;

    const sourceBatch = await batchService.getBatch({
      key: 'REF-SOURCE',
      materialId,
    });
    sourceBatchId = sourceBatch.id;

    await seedStock(sourceBatchId, storageLocationId, 100);
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('batch genealogy', () => {
    it('leaves parentBatchId null on a batch nobody split off', async () => {
      expect((await readBatch(sourceBatchId)).parentBatchId).toBeNull();
    });

    it('records the source batch when a split order creates the child', async () => {
      await splitBatchOrderService.split({
        batchId: sourceBatchId,
        items: [
          {
            batchKey: 'REF-CHILD-A',
            quantity: 10,
            locationId: storageLocationId,
          },
        ],
      });

      const child = await dataSource
        .getRepository<BatchEntityClass>(entities.batch)
        .findOneByOrFail({ key: 'REF-CHILD-A' });

      expect(child.parentBatchId).toBe(sourceBatchId);
    });

    it('records the source batch on the child an internal split creates', async () => {
      /*
       * Nothing here calls a split explicitly: holding part of a batch splits a
       * child off inside `BatchService`. That child was the orphan this column
       * exists for, so the assertion is on the internal path rather than the
       * public split order.
       */
      const held = await batchService.splitBatch({
        id: sourceBatchId,
        held: true,
      });

      expect(held.id).not.toBe(sourceBatchId);
      expect(held.parentBatchId).toBe(sourceBatchId);
    });

    it('does not flatten the chain when a child is split again', async () => {
      // Inspected first, then held: the state machine treats a top-tier flag as
      // terminal, so a two-link chain has to climb from the bottom tier.
      const child = await batchService.splitBatch({
        id: sourceBatchId,
        inspectionResult: true,
      });

      const grandchild = await batchService.splitBatch({
        id: child.id,
        held: true,
      });

      // Not the source batch: spreading the parent's row would have copied its
      // own parentBatchId and lost a link.
      expect(grandchild.parentBatchId).toBe(child.id);
      expect(child.parentBatchId).toBe(sourceBatchId);
    });
  });

  describe('batch attributes', () => {
    it('carries host attributes onto a child created by a split order', async () => {
      await splitBatchOrderService.split({
        batchId: sourceBatchId,
        items: [
          {
            batchKey: 'REF-CHILD-BIN1',
            quantity: 5,
            locationId: storageLocationId,
            attributes: { bin: 'B1', grade: 'A' },
          },
        ],
      });

      const child = await dataSource
        .getRepository<BatchEntityClass>(entities.batch)
        .findOneByOrFail({ key: 'REF-CHILD-BIN1' });

      expect(child.attributes).toEqual({ bin: 'B1', grade: 'A' });
    });

    it('splits one order into several children that differ only by attributes', async () => {
      await splitBatchOrderService.split({
        batchId: sourceBatchId,
        items: [
          {
            batchKey: 'REF-SORT-B1',
            quantity: 3,
            locationId: storageLocationId,
            attributes: { bin: 'B1' },
          },
          {
            batchKey: 'REF-SORT-B2',
            quantity: 4,
            locationId: storageLocationId,
            attributes: { bin: 'B2' },
          },
        ],
      });

      const repository = dataSource.getRepository<BatchEntityClass>(
        entities.batch,
      );

      expect(
        (await repository.findOneByOrFail({ key: 'REF-SORT-B1' })).attributes,
      ).toEqual({ bin: 'B1' });
      expect(
        (await repository.findOneByOrFail({ key: 'REF-SORT-B2' })).attributes,
      ).toEqual({ bin: 'B2' });
    });

    it('treats differing attributes as different batches, and equal ones as the same', async () => {
      const attributeSource = await batchService.getBatch({
        key: 'REF-ATTR-SOURCE',
        materialId,
      });

      const first = await batchService.splitBatch({
        id: attributeSource.id,
        held: true,
        attributes: { bin: 'B1' },
      });

      const second = await batchService.splitBatch({
        id: attributeSource.id,
        held: true,
        attributes: { bin: 'B2' },
      });

      expect(second.id).not.toBe(first.id);

      // Compared as jsonb, so a different key order is still the same document.
      const again = await batchService.splitBatch({
        id: attributeSource.id,
        held: true,
        attributes: { bin: 'B1' },
      });

      expect(again.id).toBe(first.id);
    });

    it('surfaces lineage and attributes on the aggregated stock row', async () => {
      /*
       * `batch` on a stock row resolves to the batch *group* — the thing that
       * carries the human-readable key — so neither of these is reachable
       * through it. They ride along on the aggregate the same way `saleId` and
       * `vendorId` already do.
       */
      const source = await batchService.getBatch({
        key: 'REF-AGG-SOURCE',
        materialId,
      });

      await seedStock(source.id, storageLocationId, 20);

      const child = await batchService.splitBatch({
        id: source.id,
        held: true,
        attributes: { bin: 'B7', grade: 'A' },
      });

      await seedStock(child.id, storageLocationId, 5);

      const [items] = await stockService.findAggregatedStocks({
        batchId: child.id,
      });

      expect(items).toHaveLength(1);
      expect(items[0].parentBatchId).toBe(source.id);
      expect(items[0].attributes).toEqual({ bin: 'B7', grade: 'A' });

      const result = await execute(`{
        aggregatedStocks(batchId: "${child.id}") {
          items { parentBatchId attributes }
        }
      }`);

      expect(result.errors).toBeUndefined();

      const payload = result.data?.['aggregatedStocks'] as {
        items: {
          parentBatchId: string | null;
          attributes: Record<string, unknown> | null;
        }[];
      };

      expect(payload.items[0].parentBatchId).toBe(source.id);
      expect(payload.items[0].attributes).toEqual({ bin: 'B7', grade: 'A' });
    });

    it('leaves both null on a batch that was never split', async () => {
      const [items] = await stockService.findAggregatedStocks({
        batchId: sourceBatchId,
        locationId: storageLocationId,
      });

      expect(items[0].parentBatchId).toBeNull();
      expect(items[0].attributes).toBeNull();
    });

    it('still reuses the sibling when neither side carries attributes', async () => {
      const plainSource = await batchService.getBatch({
        key: 'REF-PLAIN-SOURCE',
        materialId,
      });

      const first = await batchService.splitBatch({
        id: plainSource.id,
        held: true,
      });
      const second = await batchService.splitBatch({
        id: plainSource.id,
        held: true,
      });

      expect(second.id).toBe(first.id);
    });
  });

  describe('excludeLocationIds', () => {
    let wipBatchId: string;

    beforeAll(async () => {
      const wipBatch = await batchService.getBatch({
        key: 'REF-WIP-BATCH',
        materialId,
      });
      wipBatchId = wipBatch.id;

      await seedStock(wipBatchId, wipLocationId, 40);
    });

    it('drops the excluded location from the aggregate', async () => {
      const [items] = await stockService.findAggregatedStocks({
        materialId,
        excludeLocationIds: [wipLocationId],
      });

      expect(items.some((item) => item.locationId === wipLocationId)).toBe(
        false,
      );
      expect(items.some((item) => item.locationId === storageLocationId)).toBe(
        true,
      );
    });

    it('keeps the excluded location when the filter is omitted', async () => {
      const [items] = await stockService.findAggregatedStocks({ materialId });

      expect(items.some((item) => item.locationId === wipLocationId)).toBe(
        true,
      );
    });

    it('treats an empty array as no filter at all', async () => {
      const [items] = await stockService.findAggregatedStocks({
        materialId,
        excludeLocationIds: [],
      });

      expect(items.some((item) => item.locationId === wipLocationId)).toBe(
        true,
      );
    });

    it('applies the same exclusion through the schema', async () => {
      const result = await execute(`{
        aggregatedStocks(
          materialKey: "REF-MATERIAL"
          excludeLocationIds: ["${wipLocationId}"]
        ) { items { location { id } } total }
      }`);

      expect(result.errors).toBeUndefined();

      const payload = result.data?.['aggregatedStocks'] as {
        items: { location: { id: string } }[];
      };

      expect(
        payload.items.some((item) => item.location.id === wipLocationId),
      ).toBe(false);
    });

    it('excludes on the flat stock list too', async () => {
      const [items] = await stockService.findMany({
        materialId,
        excludeLocationIds: [wipLocationId],
      });

      expect(items.some((item) => item.locationId === wipLocationId)).toBe(
        false,
      );
    });
  });

  describe('order references', () => {
    let transferOrderId: string;
    let otherOrderId: string;

    beforeAll(async () => {
      const orderRepository = dataSource.getRepository<OrderEntity>(
        entities.order,
      );

      transferOrderId = (await orderRepository.save(orderRepository.create({})))
        .id;
      otherOrderId = (await orderRepository.save(orderRepository.create({})))
        .id;

      await orderReferenceService.attach({
        orderType: WmsOrderType.TRANSFER_ORDER,
        orderId: transferOrderId,
        references: [
          {
            referenceType: 'work-order',
            referenceId: 'WO-1',
            referenceLine: '0010',
            metadata: { componentLine: 3 },
          },
        ],
      });

      await orderReferenceService.attach({
        orderType: WmsOrderType.SCRAPE_ORDER,
        orderId: otherOrderId,
        references: [
          { referenceType: 'work-order', referenceId: 'WO-10' },
          { referenceType: 'repair-job', referenceId: 'WO-1' },
        ],
      });
    });

    it('lists what an order was opened for', async () => {
      const [items, total] = await orderReferenceService.findMany({
        orderType: WmsOrderType.TRANSFER_ORDER,
        orderId: transferOrderId,
      });

      expect(total).toBe(1);
      expect(items[0].referenceId).toBe('WO-1');
      expect(items[0].referenceLine).toBe('0010');
      expect(items[0].metadata).toEqual({ componentLine: 3 });
    });

    it('lists every order opened for a document', async () => {
      const [items] = await orderReferenceService.findMany({
        referenceType: 'work-order',
        referenceId: 'WO-1',
      });

      expect(items.map((item) => item.orderId)).toEqual([transferOrderId]);
    });

    it('matches the reference id exactly, so WO-1 does not pull in WO-10', async () => {
      const [items] = await orderReferenceService.findMany({
        referenceType: 'work-order',
        referenceId: 'WO-10',
      });

      expect(items.map((item) => item.orderId)).toEqual([otherOrderId]);
    });

    it('separates two documents that share an id but not a type', async () => {
      const [items] = await orderReferenceService.findMany({
        referenceId: 'WO-1',
      });

      expect(items.map((item) => item.referenceType).sort()).toEqual([
        'repair-job',
        'work-order',
      ]);
    });

    it('replaces the whole set for one order', async () => {
      const orderRepository = dataSource.getRepository<OrderEntity>(
        entities.order,
      );
      const orderId = (await orderRepository.save(orderRepository.create({})))
        .id;

      await orderReferenceService.attach({
        orderType: WmsOrderType.HOLD_INVENTORY_ORDER,
        orderId,
        references: [{ referenceType: 'ncr', referenceId: 'NCR-1' }],
      });

      await orderReferenceService.replace({
        orderType: WmsOrderType.HOLD_INVENTORY_ORDER,
        orderId,
        references: [{ referenceType: 'ncr', referenceId: 'NCR-2' }],
      });

      const [items, total] = await orderReferenceService.findMany({
        orderType: WmsOrderType.HOLD_INVENTORY_ORDER,
        orderId,
      });

      expect(total).toBe(1);
      expect(items[0].referenceId).toBe('NCR-2');
    });

    it('clears them when replace is given nothing', async () => {
      const orderRepository = dataSource.getRepository<OrderEntity>(
        entities.order,
      );
      const orderId = (await orderRepository.save(orderRepository.create({})))
        .id;

      await orderReferenceService.attach({
        orderType: WmsOrderType.MERGE_BATCH_ORDER,
        orderId,
        references: [{ referenceType: 'ncr', referenceId: 'NCR-3' }],
      });

      await orderReferenceService.replace({
        orderType: WmsOrderType.MERGE_BATCH_ORDER,
        orderId,
        references: [],
      });

      const [, total] = await orderReferenceService.findMany({
        orderType: WmsOrderType.MERGE_BATCH_ORDER,
        orderId,
      });

      expect(total).toBe(0);
    });

    it('batches a whole page of orders in one round trip', async () => {
      const items = await orderReferenceService.findByOrders(
        WmsOrderType.TRANSFER_ORDER,
        [transferOrderId],
      );

      expect(items).toHaveLength(1);
      expect(items[0].orderId).toBe(transferOrderId);
    });

    it('reads them through the schema', async () => {
      const result = await execute(`{
        orderReferences(referenceType: "work-order", referenceId: "WO-1") {
          items { orderType orderId referenceType referenceId referenceLine metadata }
          total
        }
      }`);

      expect(result.errors).toBeUndefined();

      const payload = result.data?.['orderReferences'] as {
        items: {
          orderType: string;
          orderId: string;
          metadata: Record<string, unknown> | null;
        }[];
        total: number;
      };

      expect(payload.total).toBe(1);
      expect(payload.items[0].orderType).toBe('TRANSFER_ORDER');
      expect(payload.items[0].orderId).toBe(transferOrderId);
      expect(payload.items[0].metadata).toEqual({ componentLine: 3 });
    });

    /*
     * `findMany` reaches the schema only through a resolver that fills in the
     * arguments it cares about. A consumer of @rytass/wms-module-core calls it
     * with none of them — the shape an optional-argument signature invites, and
     * the one no in-repo caller ever produces.
     */
    it('lists everything when every optional argument is omitted', async () => {
      const [items, total] = await orderReferenceService.findMany({});

      expect(total).toBeGreaterThanOrEqual(3);
      expect(items.length).toBe(total);
    });
  });
});
