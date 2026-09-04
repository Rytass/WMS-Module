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
  OrderReferenceService,
  SplitBatchOrderChangeEntityClass,
  SplitBatchOrderService,
  StockEntityClass,
  StockService,
  WmsEntities,
  WmsEventDispatcher,
  WmsOperationRunner,
  WmsOrderType,
  type WmsActor,
  type WmsAfterEventContext,
  type WmsBeforeHookContext,
} from '@rytass/wms-module-core';
import { WmsModuleGraphqlModule } from './graphql.module';
import { LoaderService, createWmsLoaders } from './helpers';

/**
 * The event guarantee, on both paths that can reach it.
 *
 * Before `WmsOperationRunner` the whole sequence — before-hook, dispatch scope,
 * post-commit flush — lived inside the GraphQL interceptor, so a host calling a
 * domain service directly got none of it. `StockChangeSubscriber` still
 * collected its events, but with no scope open they went nowhere and nobody
 * flushed them. That silent nothing is what these cases pin down: the same
 * hooks and listeners must fire whether the operation came in through the
 * schema or through a service call, and a hook must be able to veto either.
 *
 * The suite doubles as the only coverage the event system has at all, so it
 * also pins the GraphQL path the interceptor refactor moved.
 *
 * Requires a reachable PostgreSQL; override with WMS_TEST_DB_* env vars.
 */
const DB_HOST = process.env['WMS_TEST_DB_HOST'] ?? 'localhost';
const DB_PORT = Number(process.env['WMS_TEST_DB_PORT'] ?? 5432);
const DB_USER =
  process.env['WMS_TEST_DB_USER'] ?? process.env['USER'] ?? 'postgres';
const DB_PASS = process.env['WMS_TEST_DB_PASS'];
const DB_NAME =
  process.env['WMS_TEST_OPERATION_RUNNER_DB_NAME'] ??
  'wms_module_operation_runner_test';

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

interface RecordedHook {
  readonly event: string;
  readonly source: 'graphql' | 'host';
  readonly hasExecutionContext: boolean;
  readonly args: Readonly<Record<string, unknown>>;
  readonly actor: WmsActor | null;
}

/*
 * The hook maps are captured when the module is built, so one app serves every
 * case: the handlers close over these, and each test reads or steers them.
 */
const beforeCalls: RecordedHook[] = [];
const afterCalls: { event: string; payload: unknown }[] = [];
let vetoEvent: string | null = null;
/** What each listener could see in the database at the moment it ran. */
const visibleAtFlush: (number | null)[] = [];

const recordBefore = async (context: WmsBeforeHookContext): Promise<void> => {
  beforeCalls.push({
    event: context.event,
    source: context.source,
    hasExecutionContext: context.executionContext !== null,
    args: context.args,
    actor: context.actor,
  });

  if (vetoEvent === context.event) {
    throw new Error(`vetoed ${context.event}`);
  }
};

const recordAfter = async (context: WmsAfterEventContext): Promise<void> => {
  afterCalls.push({ event: context.event, payload: context.payload });
};

/** Flush sizes, in order, for the run under test. */
const flushCalls: number[] = [];

/**
 * How many split-change rows the given base order has, read on a connection
 * that is not the operation's. Assigned once the app is up.
 */
let splitChangeCount: (orderId: string) => Promise<number | null> = async () =>
  null;

describe('WmsOperationRunner (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let entities: WmsEntities;
  let stockService: StockService;
  let batchService: BatchService;
  let splitBatchOrderService: SplitBatchOrderService;
  let orderReferenceService: OrderReferenceService;
  let runner: WmsOperationRunner;
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

  const newBaseOrderId = async (): Promise<string> => {
    const repository = dataSource.getRepository<OrderEntity>(entities.order);
    return (await repository.save(repository.create({}))).id;
  };

  /** A batch with 50 units on hand, ready to be split. */
  const seedBatch = async (key: string): Promise<string> => {
    const batch = await batchService.getBatch({ key, materialId });

    await dataSource.getRepository<StockEntityClass>(entities.stock).save({
      orderId: await newBaseOrderId(),
      materialId,
      batchId: batch.id,
      locationId,
      loaderId: stockService.resolveLoaderId(null),
      quantity: 50,
    } as never);

    return batch.id;
  };

  beforeEach(() => {
    beforeCalls.length = 0;
    afterCalls.length = 0;
    visibleAtFlush.length = 0;
    vetoEvent = null;
    flushCalls.length = 0;
  });

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
          beforeHooks: {
            'order-reference.attached': recordBefore,
            'batch.splitted': recordBefore,
          },
          afterListeners: {
            'order-reference.attached': recordAfter,
            'batch.splitted': recordAfter,
            'stock.splitted': async (context): Promise<void> => {
              await recordAfter(context);

              // Reads through the DataSource, not the operation's manager. A
              // flush that ran before the commit would see nothing here.
              const payload = context.payload as { orderId: string };
              const rows = await splitChangeCount(payload.orderId);
              visibleAtFlush.push(rows);
            },
          },
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
    runner = app.get(WmsOperationRunner);

    /*
     * Count flushes rather than events. Every listener appends to a shared
     * array, so a buffer flushed twice with one event each is indistinguishable
     * from one flushed once with two — which is how the nested-scope test
     * managed to pass with the nesting removed entirely.
     */
    const dispatcher = app.get(WmsEventDispatcher);
    const realFlush = dispatcher.flush.bind(dispatcher);
    jest.spyOn(dispatcher, 'flush').mockImplementation(async (events) => {
      flushCalls.push(events.length);
      return realFlush(events);
    });
    schema = app.get(GraphQLSchemaHost).schema;
    loaderService = app.get(LoaderService);

    // Reads through the DataSource, not the operation's manager: rows written
    // inside the transaction are invisible here until it commits.
    splitChangeCount = async (orderId) =>
      dataSource
        .getRepository(SplitBatchOrderChangeEntityClass)
        .count({ where: { id: orderId } });

    const locationRepository = dataSource.getRepository<LocationEntityClass>(
      entities.location,
    );
    const location = await locationRepository.save(
      locationRepository.create({
        key: 'RUNNER-LOCATION',
        description: 'location',
        isActive: true,
      } as DeepPartial<LocationEntityClass>),
    );
    locationId = location.id;

    const materialRepository = dataSource.getRepository<MaterialEntityClass>(
      entities.material,
    );
    const material = await materialRepository.save(
      materialRepository.create({
        key: 'RUNNER-MATERIAL',
      } as DeepPartial<MaterialEntityClass>),
    );
    materialId = material.id;
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('through the schema', () => {
    it('runs the before-hook with an execution context, then the listener', async () => {
      const orderId = await newBaseOrderId();

      const result = await execute(`mutation {
        attachOrderReferences(
          orderType: TRANSFER_ORDER
          orderId: "${orderId}"
          references: [{ referenceType: "work-order", referenceId: "WO-A" }]
        ) { id }
      }`);

      expect(result.errors).toBeUndefined();

      expect(beforeCalls).toEqual([
        {
          event: 'order-reference.attached',
          source: 'graphql',
          hasExecutionContext: true,
          args: expect.objectContaining({ orderId }),
          // No `actorExtractor` is configured for this module.
          actor: null,
        },
      ]);

      expect(afterCalls.map(({ event }) => event)).toEqual([
        'order-reference.attached',
      ]);
    });

    it('lets a before-hook veto the mutation before anything is written', async () => {
      const orderId = await newBaseOrderId();
      vetoEvent = 'order-reference.attached';

      const result = await execute(`mutation {
        attachOrderReferences(
          orderType: TRANSFER_ORDER
          orderId: "${orderId}"
          references: [{ referenceType: "work-order", referenceId: "WO-VETO" }]
        ) { id }
      }`);

      expect(result.errors?.[0].message).toContain('vetoed');
      expect(afterCalls).toEqual([]);

      const [, total] = await orderReferenceService.findMany({ orderId });
      expect(total).toBe(0);
    });
  });

  describe('from a direct service call', () => {
    it('runs the same hook and listener, marked as coming from the host', async () => {
      const orderId = await newBaseOrderId();

      await runner.run(
        {
          event: 'order-reference.attached',
          args: { orderId },
        },
        () =>
          orderReferenceService.attach({
            orderType: WmsOrderType.SCRAPE_ORDER,
            orderId,
            references: [
              { referenceType: 'work-order', referenceId: 'WO-HOST' },
            ],
          }),
      );

      expect(beforeCalls).toEqual([
        {
          event: 'order-reference.attached',
          source: 'host',
          // No request to reach into, and nothing fabricated to pretend there is.
          hasExecutionContext: false,
          args: { orderId },
          actor: null,
        },
      ]);

      expect(afterCalls.map(({ event }) => event)).toEqual([
        'order-reference.attached',
      ]);
    });

    it('lets a before-hook veto it too, before anything is written', async () => {
      const orderId = await newBaseOrderId();
      vetoEvent = 'order-reference.attached';

      await expect(
        runner.run(
          { event: 'order-reference.attached', args: { orderId } },
          () =>
            orderReferenceService.attach({
              orderType: WmsOrderType.SCRAPE_ORDER,
              orderId,
              references: [
                { referenceType: 'work-order', referenceId: 'WO-HOST-VETO' },
              ],
            }),
        ),
      ).rejects.toThrow('vetoed');

      expect(afterCalls).toEqual([]);

      const [, total] = await orderReferenceService.findMany({ orderId });
      expect(total).toBe(0);
    });

    it('flushes the stock events the subscriber collected inside a service', async () => {
      const batchId = await seedBatch('RUNNER-BATCH-A');

      await runner.run({ event: 'batch.splitted' }, () =>
        splitBatchOrderService.split({
          batchId,
          items: [{ batchKey: 'RUNNER-CHILD-A', quantity: 10, locationId }],
        }),
      );

      // The operation event and the stock event the TypeORM subscriber wrote,
      // both flushed once, after the service's transaction committed.
      expect(afterCalls.map(({ event }) => event).sort()).toEqual([
        'batch.splitted',
        'stock.splitted',
      ]);
    });

    it('flushes stock events with no operation event at all', async () => {
      const batchId = await seedBatch('RUNNER-BATCH-B');

      await runner.run({}, () =>
        splitBatchOrderService.split({
          batchId,
          items: [{ batchKey: 'RUNNER-CHILD-B', quantity: 10, locationId }],
        }),
      );

      expect(beforeCalls).toEqual([]);
      expect(afterCalls.map(({ event }) => event)).toEqual(['stock.splitted']);
    });

    it('flushes once when a run is nested inside another', async () => {
      const batchId = await seedBatch('RUNNER-BATCH-C');

      await runner.run({ event: 'batch.splitted' }, () =>
        runner.run({}, () =>
          splitBatchOrderService.split({
            batchId,
            items: [{ batchKey: 'RUNNER-CHILD-C', quantity: 10, locationId }],
          }),
        ),
      );

      /*
       * The number of flushes, not the set of events. Asserting the set passes
       * just as happily when the inner run opens its own scope: two flushes of
       * one event each build the same array as one flush of two, which is how
       * this test used to stay green with the nesting removed entirely.
       */
      expect(flushCalls).toEqual([2]);

      expect(afterCalls.map(({ event }) => event).sort()).toEqual([
        'batch.splitted',
        'stock.splitted',
      ]);
    });

    it('carries the actor into both the hook and the event payload', async () => {
      const orderId = await newBaseOrderId();
      const actor = { id: 'operator-7', domain: 'warehouse' };

      await runner.run(
        { event: 'order-reference.attached', args: { orderId }, actor },
        () =>
          orderReferenceService.attach({
            orderType: WmsOrderType.SCRAPE_ORDER,
            orderId,
            references: [
              { referenceType: 'work-order', referenceId: 'WO-ACTOR' },
            ],
          }),
      );

      // Nothing collected the actor before, so whether it reached either side
      // was unverified — it is the audit trail the option exists for.
      expect(beforeCalls[0].actor).toEqual(actor);

      const payload = afterCalls[0].payload as { actor: unknown };
      expect(payload.actor).toEqual(actor);
    });

    it('defaults the actor to null rather than leaving it undefined', async () => {
      const orderId = await newBaseOrderId();

      await runner.run(
        { event: 'order-reference.attached', args: { orderId } },
        () =>
          orderReferenceService.attach({
            orderType: WmsOrderType.SCRAPE_ORDER,
            orderId,
            references: [
              { referenceType: 'work-order', referenceId: 'WO-NO-ACTOR' },
            ],
          }),
      );

      expect(beforeCalls[0].actor).toBeNull();
      expect((afterCalls[0].payload as { actor: unknown }).actor).toBeNull();
    });

    it('lets the caller decide the event id', async () => {
      const orderId = await newBaseOrderId();

      await runner.run(
        {
          event: 'order-reference.attached',
          args: { orderId },
          // The default reads `result.id`, which is wrong for an operation
          // returning a list — `attach` returns one row per reference.
          resolveId: (_result, args) => `order:${args['orderId'] as string}`,
        },
        () =>
          orderReferenceService.attach({
            orderType: WmsOrderType.SCRAPE_ORDER,
            orderId,
            references: [
              { referenceType: 'work-order', referenceId: 'WO-RESOLVE-ID' },
            ],
          }),
      );

      expect((afterCalls[0].payload as { id: string }).id).toBe(
        `order:${orderId}`,
      );
    });

    it('falls back to the args id when the result has none', async () => {
      const orderId = await newBaseOrderId();

      await runner.run(
        { event: 'order-reference.attached', args: { id: orderId } },
        async () => true,
      );

      expect((afterCalls[0].payload as { id: string | null }).id).toBe(orderId);
    });

    it('flushes only after the transaction that produced the events commits', async () => {
      const batchId = await seedBatch('RUNNER-BATCH-D');

      await runner.run({ event: 'batch.splitted' }, () =>
        splitBatchOrderService.split({
          batchId,
          items: [{ batchKey: 'RUNNER-CHILD-D', quantity: 10, locationId }],
        }),
      );

      /*
       * Every listener in this package's specs only pushed a name into an array,
       * so nothing anywhere noticed whether the flush ran before or after the
       * commit — the invariant CLAUDE.md calls load-bearing had no assertion at
       * all. The `stock.splitted` listener reads the ledger through the
       * DataSource rather than the operation's manager: a flush inside the
       * transaction would find nothing there.
       */
      expect(visibleAtFlush.length).toBeGreaterThan(0);
      expect(visibleAtFlush).not.toContain(0);
      expect(visibleAtFlush).not.toContain(null);
    });
  });
});
