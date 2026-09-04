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
  BatchService,
  LocationEntityClass,
  MaterialEntityClass,
  ReceiveInventoryOrderService,
  StockEntityClass,
  StockService,
  StockStatus,
  WmsEntities,
} from '@rytass/wms-module-core';
import { WmsModuleGraphqlModule } from './graphql.module';
import { LoaderService, createWmsLoaders } from './helpers';

/**
 * `PENDING_INSPECTION` used to mean "never inspected", which is the resting
 * state of essentially every batch in the warehouse.
 *
 * The filter was `inspectionResult IS NULL` and nothing else, so a plain batch
 * that nobody had ever asked to inspect came back as awaiting inspection. The
 * answer was never zero and never obviously absurd, which is exactly why it
 * could sit there: a report claiming a few hundred units are waiting on QC
 * looks like a warehouse, not like a bug.
 *
 * The missing half is intent. `requireInspection` is known at receive time and
 * now lands on the batch as `requiresInspection`, so the two states are finally
 * distinguishable.
 *
 * Requires a reachable PostgreSQL; override with WMS_TEST_DB_* env vars.
 */
const DB_HOST = process.env['WMS_TEST_DB_HOST'] ?? 'localhost';
const DB_PORT = Number(process.env['WMS_TEST_DB_PORT'] ?? 5432);
const DB_USER =
  process.env['WMS_TEST_DB_USER'] ?? process.env['USER'] ?? 'postgres';
const DB_PASS = process.env['WMS_TEST_DB_PASS'];
const DB_NAME =
  process.env['WMS_TEST_PENDING_INSPECTION_DB_NAME'] ??
  'wms_module_pending_inspection_test';

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

describe('pending inspection (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let entities: WmsEntities;
  let stockService: StockService;
  let batchService: BatchService;
  let receiveService: ReceiveInventoryOrderService;
  let schema: GraphQLSchema;
  let loaderService: LoaderService;

  let materialId: string;
  let locationId: string;

  const execute = async (
    source: string,
  ): Promise<ExecutionResult<Record<string, unknown>>> =>
    graphql({
      schema,
      source,
      contextValue: { ...createWmsLoaders(loaderService) },
    }) as Promise<ExecutionResult<Record<string, unknown>>>;

  const seedStock = async (
    batchId: string,
    quantity: number,
  ): Promise<void> => {
    const orderRepository = dataSource.getRepository<OrderEntity>(
      entities.order,
    );
    const base = await orderRepository.save(orderRepository.create({}));

    await dataSource.getRepository<StockEntityClass>(entities.stock).save({
      orderId: base.id,
      materialId,
      batchId,
      locationId,
      loaderId: stockService.resolveLoaderId(null),
      quantity,
    } as never);
  };

  /** Batch keys the pending filter returns. */
  const pendingBatchIds = async (): Promise<string[]> => {
    const [items] = await stockService.findAggregatedStocks({
      materialId,
      status: StockStatus.PENDING_INSPECTION,
    });

    return items.map((item) => item.batchId).sort();
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
    receiveService = app.get(ReceiveInventoryOrderService);
    schema = app.get(GraphQLSchemaHost).schema;
    loaderService = app.get(LoaderService);

    const locationRepository = dataSource.getRepository<LocationEntityClass>(
      entities.location,
    );
    locationId = (
      await locationRepository.save(
        locationRepository.create({
          key: 'QC-LOCATION',
          description: 'location',
          isActive: true,
        } as DeepPartial<LocationEntityClass>),
      )
    ).id;

    const materialRepository = dataSource.getRepository<MaterialEntityClass>(
      entities.material,
    );
    materialId = (
      await materialRepository.save(
        materialRepository.create({
          key: 'QC-MATERIAL',
        } as DeepPartial<MaterialEntityClass>),
      )
    ).id;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('does not call a batch nobody asked to inspect "pending"', async () => {
    const plain = await batchService.getBatch({
      key: 'QC-PLAIN',
      materialId,
    });

    await seedStock(plain.id, 10);

    // The whole defect in one assertion: this batch has `inspectionResult`
    // null, like almost every batch does, and that alone must not make it
    // awaiting inspection.
    expect(await pendingBatchIds()).toEqual([]);
  });

  it('calls a batch pending once somebody asks for the inspection', async () => {
    const awaiting = await batchService.splitBatch({
      id: (await batchService.getBatch({ key: 'QC-PLAIN', materialId })).id,
      requiresInspection: true,
    });

    await seedStock(awaiting.id, 4);

    expect(await pendingBatchIds()).toEqual([awaiting.id]);
  });

  it('stops calling it pending once the inspection has a result', async () => {
    const awaiting = await batchService.getBatch({
      key: 'QC-RESOLVED',
      materialId,
    });

    const marked = await batchService.splitBatch({
      id: awaiting.id,
      requiresInspection: true,
    });

    const inspected = await batchService.splitBatch({
      id: marked.id,
      inspectionResult: true,
    });

    await seedStock(inspected.id, 6);

    expect(await pendingBatchIds()).not.toContain(inspected.id);
  });

  it('keeps a batch awaiting inspection out of the free stock it came from', async () => {
    const source = await batchService.getBatch({
      key: 'QC-SPLIT',
      materialId,
    });

    const marked = await batchService.splitBatch({
      id: source.id,
      requiresInspection: true,
    });

    // A separate batch, not the plain one: material waiting on QC must not be
    // commingled with material that is free to use, the same way held stock
    // is not.
    expect(marked.id).not.toBe(source.id);
    expect(marked.parentBatchId).toBe(source.id);
  });

  it('flags the batch a receive landed on, without moving it off the key', async () => {
    const order = await receiveService.createReceiveInventoryOrder({
      key: 'QC-RO-1',
      description: 'inspect me',
      items: [
        {
          serialId: '1',
          materialKey: 'QC-MATERIAL',
          batchKey: 'QC-RECEIVED',
          locationKey: 'QC-LOCATION',
          targetReceivedQuantity: 12,
          requireInspection: true,
        },
      ],
    });

    const [item] = await dataSource
      .getRepository(receiveService.receiveInventoryOrderItemEntity)
      .find({ where: { orderId: order.id } });

    await receiveService.receive({
      itemId: item.id,
      quantity: 12,
      batchKey: 'QC-RECEIVED',
      locationKey: 'QC-LOCATION',
    });

    /*
     * `requireInspection` defaults to true, so this is the ordinary receive
     * path. Splitting it unconditionally moved every default receipt onto a
     * synthetic child and left the key the caller asked for holding nothing —
     * an exact-id lookup on it then returned an empty list.
     */
    const received = await dataSource
      .getRepository(entities.batch)
      .findOneByOrFail({ key: 'QC-RECEIVED' });

    expect(received.requiresInspection).toBe(true);
    expect(received.parentBatchId).toBeNull();
    expect(await pendingBatchIds()).toContain(received.id);

    const [positions] = await stockService.findAggregatedStocks({
      batchId: received.id,
    });

    expect(positions.reduce((total, p) => total + Number(p.quantity), 0)).toBe(
      12,
    );
  });

  it('splits instead when the batch already holds something', async () => {
    const existing = await batchService.getBatch({
      key: 'QC-OCCUPIED',
      materialId,
    });

    await seedStock(existing.id, 30);

    const order = await receiveService.createReceiveInventoryOrder({
      key: 'QC-RO-2',
      description: 'joins occupied stock',
      items: [
        {
          serialId: '1',
          materialKey: 'QC-MATERIAL',
          batchKey: 'QC-OCCUPIED',
          locationKey: 'QC-LOCATION',
          targetReceivedQuantity: 5,
          requireInspection: true,
        },
      ],
    });

    const [item] = await dataSource
      .getRepository(receiveService.receiveInventoryOrderItemEntity)
      .find({ where: { orderId: order.id } });

    await receiveService.receive({
      itemId: item.id,
      quantity: 5,
      batchKey: 'QC-OCCUPIED',
      locationKey: 'QC-LOCATION',
    });

    // The 30 already there were never awaiting inspection, so the 5 that are
    // must not join them on the same batch.
    expect(
      (
        await dataSource
          .getRepository(entities.batch)
          .findOneByOrFail({ key: 'QC-OCCUPIED' })
      ).requiresInspection,
    ).toBe(false);

    const flagged = await dataSource
      .getRepository(entities.batch)
      .findOneByOrFail({
        parentBatchId: existing.id,
        requiresInspection: true,
      });

    expect(await pendingBatchIds()).toContain(flagged.id);
  });

  it('does not fragment one receive call across two batches', async () => {
    const order = await receiveService.createReceiveInventoryOrder({
      key: 'QC-RO-3',
      description: 'two lines, one item',
      items: [
        {
          serialId: '1',
          materialKey: 'QC-MATERIAL',
          batchKey: 'QC-TWO-LINES',
          locationKey: 'QC-LOCATION',
          targetReceivedQuantity: 60,
          requireInspection: true,
        },
      ],
    });

    const [item] = await dataSource
      .getRepository(receiveService.receiveInventoryOrderItemEntity)
      .find({ where: { orderId: order.id } });

    // Both halves used to run through `Promise.all`, so both missed the batch
    // lookup and one receipt ended up spread over two batch identities.
    await receiveService.receive([
      {
        itemId: item.id,
        quantity: 30,
        batchKey: 'QC-TWO-LINES',
        locationKey: 'QC-LOCATION',
      },
      {
        itemId: item.id,
        quantity: 30,
        batchKey: 'QC-TWO-LINES',
        locationKey: 'QC-LOCATION',
      },
    ]);

    const batches = await dataSource
      .getRepository(entities.batch)
      .find({
        where: [
          { key: 'QC-TWO-LINES' },
          {
            parentBatchId: (
              await dataSource
                .getRepository(entities.batch)
                .findOneByOrFail({ key: 'QC-TWO-LINES' })
            ).id,
          },
        ],
      });

    expect(batches).toHaveLength(1);
  });

  it('reports the flag through the schema', async () => {
    const result = await execute(`{
      aggregatedStocks(materialKey: "QC-MATERIAL", status: PENDING_INSPECTION) {
        items { requiresInspection inspectionResult }
        total
      }
    }`);

    expect(result.errors).toBeUndefined();

    const payload = result.data?.['aggregatedStocks'] as {
      items: {
        requiresInspection: boolean | null;
        inspectionResult: boolean | null;
      }[];
      total: number;
    };

    expect(payload.total).toBeGreaterThan(0);
    expect(
      payload.items.every(
        (item) => item.requiresInspection === true && !item.inspectionResult,
      ),
    ).toBe(true);
  });
});
