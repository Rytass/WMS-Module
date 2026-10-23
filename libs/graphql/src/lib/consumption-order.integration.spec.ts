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
  ConsumptionChangeKind,
  ConsumptionOrderChangeEntityClass,
  ConsumptionOrderService,
  LocationEntityClass,
  MaterialEntityClass,
  MaterialService,
  MaterialUnitEntityClass,
  StockEntityClass,
  StockService,
  WmsEntities,
  WmsOperationRunner,
  type WmsAfterEventContext,
} from '@rytass/wms-module-core';
import { WmsModuleGraphqlModule } from './graphql.module';
import { LoaderService, createWmsLoaders } from './helpers';

/**
 * The consumption order: material handed to a process that eats some of it.
 *
 * Three actions on one document — issue it out, take back what came home,
 * settle what was used — because they are one story and because hold/release,
 * allocate/deallocate and transfer/cancel are each one document too.
 *
 * The two properties worth pinning hardest are the ones a reviewer would
 * reasonably doubt. First, an issue moves stock between locations and touches
 * nothing else: no new status, no split batch, so the same batch key is in two
 * places at once and the aggregate has to add up. Second, a return and a
 * settlement are both negative, so nothing can distinguish them by sign — the
 * `kind` column is load-bearing all the way out to the `stock.*` event the
 * TypeORM subscriber emits.
 *
 * Requires a reachable PostgreSQL; override with WMS_TEST_DB_* env vars.
 */
const DB_HOST = process.env['WMS_TEST_DB_HOST'] ?? 'localhost';
const DB_PORT = Number(process.env['WMS_TEST_DB_PORT'] ?? 5432);
const DB_USER =
  process.env['WMS_TEST_DB_USER'] ?? process.env['USER'] ?? 'postgres';
const DB_PASS = process.env['WMS_TEST_DB_PASS'];
const DB_NAME =
  process.env['WMS_TEST_CONSUMPTION_DB_NAME'] ?? 'wms_module_consumption_test';

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

const stockEvents: string[] = [];

const recordStockEvent = async (
  context: WmsAfterEventContext,
): Promise<void> => {
  stockEvents.push(context.event);
};

describe('consumption order (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let entities: WmsEntities;
  let stockService: StockService;
  let batchService: BatchService;
  let service: ConsumptionOrderService;
  let runner: WmsOperationRunner;
  let schema: GraphQLSchema;
  let loaderService: LoaderService;

  let materialId: string;
  let shelfId: string;
  let benchId: string;
  /** A second material carrying a BOX unit worth 12 of its base unit. */
  let boxMaterialId: string;
  let boxUnitId: string;

  const execute = async (
    source: string,
  ): Promise<ExecutionResult<Record<string, unknown>>> =>
    graphql({
      schema,
      source,
      contextValue: { ...createWmsLoaders(loaderService) },
    }) as Promise<ExecutionResult<Record<string, unknown>>>;

  /** A fresh batch of `quantity` units sitting on the shelf. */
  const seedBatch = async (key: string, quantity = 100): Promise<string> => {
    const batch = await batchService.getBatch({ key, materialId });
    const orderRepository = dataSource.getRepository<OrderEntity>(
      entities.order,
    );
    const base = await orderRepository.save(orderRepository.create({}));

    await dataSource.getRepository<StockEntityClass>(entities.stock).save({
      orderId: base.id,
      materialId,
      batchId: batch.id,
      locationId: shelfId,
      loaderId: stockService.resolveLoaderId(null),
      quantity,
    } as never);

    return batch.id;
  };

  /** On-hand quantity for one batch at one location. */
  const onHand = async (
    batchId: string,
    locationId: string,
  ): Promise<number> => {
    const [items] = await stockService.findAggregatedStocks({
      batchId,
      locationId,
    });

    return items.reduce((total, item) => total + Number(item.quantity), 0);
  };

  const newBaseOrderId = async (): Promise<string> => {
    const repository = dataSource.getRepository<OrderEntity>(entities.order);
    return (await repository.save(repository.create({}))).id;
  };

  /** An order with one line for `quantity` off the given batch. */
  const newOrder = async (
    batchId: string,
    quantity: number,
  ): Promise<{ orderId: string; itemId: string }> => {
    const order = await service.createConsumptionOrder({
      description: 'test',
      items: [
        {
          materialId,
          batchId,
          locationId: shelfId,
          targetLocationId: benchId,
          quantity,
        },
      ],
    });

    const [progress] = await service.getProgress(order.id);

    return { orderId: order.id, itemId: progress.itemId };
  };

  beforeEach(() => {
    stockEvents.length = 0;
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
          afterListeners: {
            'stock.issued': recordStockEvent,
            'stock.returned': recordStockEvent,
            'stock.consumed': recordStockEvent,
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
    service = app.get(ConsumptionOrderService);
    runner = app.get(WmsOperationRunner);
    schema = app.get(GraphQLSchemaHost).schema;
    loaderService = app.get(LoaderService);

    const locationRepository = dataSource.getRepository<LocationEntityClass>(
      entities.location,
    );

    shelfId = (
      await locationRepository.save(
        locationRepository.create({
          key: 'CSO-SHELF',
          description: 'shelf',
          isActive: true,
        } as DeepPartial<LocationEntityClass>),
      )
    ).id;

    benchId = (
      await locationRepository.save(
        locationRepository.create({
          key: 'CSO-BENCH',
          description: 'the consuming location',
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
          key: 'CSO-MATERIAL',
        } as DeepPartial<MaterialEntityClass>),
      )
    ).id;

    /*
     * Everything above this line uses a material with no alternate unit, so
     * every conversion factor is 1 — which is exactly why a unit-conversion
     * defect could hide behind a green suite. This one has a real factor.
     */
    const materialService = app.get(MaterialService);
    const boxMaterial = await materialService.createMaterial({
      key: 'CSO-BOX-MATERIAL',
      description: 'sold by the box',
      baseUnit: 'PCS',
      units: [{ unit: 'BOX', conversionFactor: 12 }],
    });
    boxMaterialId = boxMaterial.id;
    boxUnitId = (
      await dataSource
        .getRepository<MaterialUnitEntityClass>(MaterialUnitEntityClass)
        .findOneByOrFail({ materialId: boxMaterialId, unit: 'BOX' })
    ).id;
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('the whole life of one handover', () => {
    it('issues, returns and settles, leaving the ledger consistent', async () => {
      const batchId = await seedBatch('CSO-LIFE');
      const { orderId, itemId } = await newOrder(batchId, 40);

      await service.issue({ orderId });

      // The same batch is now in two places. No status changed and no child
      // batch was created: an issue is a location move and nothing more.
      expect(await onHand(batchId, shelfId)).toBe(60);
      expect(await onHand(batchId, benchId)).toBe(40);

      await service.return({ orderId, items: [{ itemId, quantity: 15 }] });

      expect(await onHand(batchId, shelfId)).toBe(75);
      expect(await onHand(batchId, benchId)).toBe(25);

      await service.settle({ orderId, items: [{ itemId, quantity: 25 }] });

      // Settled stock leaves inventory entirely rather than going back.
      expect(await onHand(batchId, shelfId)).toBe(75);
      expect(await onHand(batchId, benchId)).toBe(0);

      expect(await service.getProgress(orderId)).toEqual([
        {
          itemId,
          target: 40,
          issued: 40,
          returned: 15,
          settled: 25,
          outstanding: 0,
        },
      ]);
    });

    it('tells a return and a settlement apart, which the sign cannot', async () => {
      const batchId = await seedBatch('CSO-KIND');
      const { orderId, itemId } = await newOrder(batchId, 20);

      await service.issue({ orderId });
      await service.return({ orderId, items: [{ itemId, quantity: 5 }] });
      await service.settle({ orderId, items: [{ itemId, quantity: 15 }] });

      const changes = await dataSource
        .getRepository(ConsumptionOrderChangeEntityClass)
        .find({ where: { itemId }, order: { createdAt: 'ASC' } });

      expect(changes.map(({ kind }) => kind)).toEqual([
        ConsumptionChangeKind.ISSUE,
        ConsumptionChangeKind.RETURN,
        ConsumptionChangeKind.SETTLE,
      ]);

      // Both of the last two are negative; only `kind` separates them.
      expect(
        changes.map(({ quantityChanged }) => Number(quantityChanged)),
      ).toEqual([20, -5, -15]);
    });

    it('emits a distinct stock event for each of the three', async () => {
      const batchId = await seedBatch('CSO-EVENTS');
      const { orderId, itemId } = await newOrder(batchId, 12);

      await runner.run({}, () => service.issue({ orderId }));
      await runner.run({}, () =>
        service.return({ orderId, items: [{ itemId, quantity: 2 }] }),
      );
      await runner.run({}, () =>
        service.settle({ orderId, items: [{ itemId, quantity: 10 }] }),
      );

      expect(stockEvents).toEqual([
        'stock.issued',
        'stock.returned',
        'stock.consumed',
      ]);
    });
  });

  /*
   * Every case above uses a material whose only unit is its base unit, so every
   * conversion factor is 1 and a unit mistake is invisible. These use a line
   * measured in BOXes worth 12 each: the change rows and the stock ledger are in
   * base units, the target and a caller's quantity are in the item's unit, and
   * anything that compares the two without converting is wrong by a factor of
   * twelve.
   */
  describe('a line measured in something other than the base unit', () => {
    /** Seed a BOX-material batch and open an order for `boxes` of it. */
    const newBoxOrder = async (
      key: string,
      boxes: number,
    ): Promise<{ orderId: string; itemId: string; batchId: string }> => {
      const batch = await batchService.getBatch({
        key,
        materialId: boxMaterialId,
      });

      await dataSource.getRepository<StockEntityClass>(entities.stock).save({
        orderId: await newBaseOrderId(),
        materialId: boxMaterialId,
        batchId: batch.id,
        locationId: shelfId,
        loaderId: stockService.resolveLoaderId(null),
        quantity: 1000,
      } as never);

      const order = await service.createConsumptionOrder({
        items: [
          {
            materialId: boxMaterialId,
            batchId: batch.id,
            locationId: shelfId,
            targetLocationId: benchId,
            unitId: boxUnitId,
            quantity: boxes,
          },
        ],
      });

      const [progress] = await service.getProgress(order.id);

      return { orderId: order.id, itemId: progress.itemId, batchId: batch.id };
    };

    it('issues, returns and settles a whole order without converting twice', async () => {
      const { orderId, itemId, batchId } = await newBoxOrder('CSO-BOX-A', 10);

      await service.issue({ orderId });

      // Ten boxes of twelve.
      expect(await onHand(batchId, benchId)).toBe(120);

      await service.return({ orderId, items: [{ itemId, quantity: 4 }] });

      expect(await onHand(batchId, benchId)).toBe(72);

      // The one that used to be impossible: a whole-order settle read the
      // outstanding amount in base units and then multiplied it by the factor
      // again, asking for 864 of the 72 that were there.
      await service.settle({ orderId });

      expect(await onHand(batchId, benchId)).toBe(0);
      expect(await onHand(batchId, shelfId)).toBe(1000 - 120 + 48);
    });

    it('finishes a line that was partly issued', async () => {
      const { orderId, batchId, itemId } = await newBoxOrder('CSO-BOX-B', 10);

      await service.issue({ orderId, items: [{ itemId, quantity: 1 }] });

      // Used to strand the line: one box out of ten looked like twelve of ten,
      // so the whole-order call treated it as finished and an explicit call
      // reported minus two remaining.
      await service.issue({ orderId });

      expect(await onHand(batchId, benchId)).toBe(120);
      expect((await service.getProgress(orderId))[0].outstanding).toBe(120);
    });

    it('still refuses to issue more boxes than the line asked for', async () => {
      const { orderId, itemId } = await newBoxOrder('CSO-BOX-C', 10);

      await expect(
        service.issue({ orderId, items: [{ itemId, quantity: 11 }] }),
      ).rejects.toThrow(/left to issue/);
    });
  });

  describe('what it refuses', () => {
    it('will not issue more than the line asked for', async () => {
      const batchId = await seedBatch('CSO-OVER-ISSUE');
      const { orderId, itemId } = await newOrder(batchId, 10);

      await expect(
        service.issue({ orderId, items: [{ itemId, quantity: 11 }] }),
      ).rejects.toThrow('only 10 left to issue');
    });

    it('will not settle more than the process is holding', async () => {
      const batchId = await seedBatch('CSO-OVER-SETTLE');
      const { orderId, itemId } = await newOrder(batchId, 10);

      await service.issue({ orderId, items: [{ itemId, quantity: 4 }] });

      await expect(
        service.settle({ orderId, items: [{ itemId, quantity: 5 }] }),
      ).rejects.toThrow('only 4 outstanding');
    });

    it('will not issue stock that is not on the shelf', async () => {
      const batchId = await seedBatch('CSO-SHORT', 3);
      const { orderId } = await newOrder(batchId, 10);

      await expect(service.issue({ orderId })).rejects.toThrow(
        'Insufficient stock',
      );
    });

    it('will not replace the lines once stock has moved', async () => {
      const batchId = await seedBatch('CSO-FROZEN');
      const { orderId } = await newOrder(batchId, 5);

      await service.issue({ orderId });

      await expect(
        service.updateConsumptionOrder({
          id: orderId,
          items: [{ materialId, batchId, quantity: 1 }],
        }),
      ).rejects.toThrow('already moved stock');
    });

    it('will not over-issue when one call names the same line twice', async () => {
      const batchId = await seedBatch('CSO-DOUBLE-LINE');
      const { orderId, itemId } = await newOrder(batchId, 10);

      // The progress snapshot is read once, before the loop. Without also
      // accumulating inside it, two lines for the same item each see the same
      // "nothing issued yet" and both go through.
      await expect(
        service.issue({
          orderId,
          items: [
            { itemId, quantity: 6 },
            { itemId, quantity: 6 },
          ],
        }),
      ).rejects.toThrow(/left to issue/);

      expect(await onHand(batchId, benchId)).toBe(0);
    });

    it('will not over-issue when two calls race', async () => {
      const batchId = await seedBatch('CSO-RACE');
      const { orderId } = await newOrder(batchId, 10);

      // Both transactions read progress before either writes, so without a lock
      // on the order they both believe the whole line is still outstanding.
      //
      // Both calls legitimately *succeed*: the second one waits on the lock,
      // re-reads, finds nothing left and skips the line, which is the same
      // no-op an unraced repeat call performs. What must not happen is the
      // stock moving twice.
      await Promise.all([
        service.issue({ orderId }),
        service.issue({ orderId }),
      ]);

      expect(await onHand(batchId, benchId)).toBe(10);
      expect((await service.getProgress(orderId))[0].issued).toBe(10);
    });

    it('will not move stock for an order that was removed', async () => {
      const batchId = await seedBatch('CSO-REMOVED');
      const { orderId } = await newOrder(batchId, 5);

      await service.removeConsumptionOrder(orderId);

      await expect(service.issue({ orderId })).rejects.toThrow(
        /has been removed/,
      );
      expect(await onHand(batchId, benchId)).toBe(0);
    });

    it('will not resurrect a removed order through update', async () => {
      const batchId = await seedBatch('CSO-RESURRECT');
      const { orderId } = await newOrder(batchId, 5);

      await service.removeConsumptionOrder(orderId);

      // The "has anything moved" guard only looks at live items, and a removed
      // order has none — so this used to attach a fresh set of lines to an
      // order that no listing shows, and then move stock with them.
      await expect(
        service.updateConsumptionOrder({
          id: orderId,
          items: [{ materialId, batchId, quantity: 5 }],
        }),
      ).rejects.toThrow(/has been removed/);
    });

    it('refuses an explicitly empty line list', async () => {
      const batchId = await seedBatch('CSO-EMPTY-LINES');
      const { orderId } = await newOrder(batchId, 5);

      await expect(service.issue({ orderId, items: [] })).rejects.toThrow(
        /empty line list/,
      );
    });

    it('rejects a line that belongs to another order', async () => {
      const batchId = await seedBatch('CSO-STRANGER');
      const { orderId } = await newOrder(batchId, 5);
      const other = await newOrder(batchId, 5);

      await expect(
        service.issue({ orderId, items: [{ itemId: other.itemId }] }),
      ).rejects.toThrow('does not belong to');
    });
  });

  describe('acting on the whole order', () => {
    it('skips lines that are already fully issued instead of failing', async () => {
      const batchId = await seedBatch('CSO-REPEAT');
      const { orderId } = await newOrder(batchId, 8);

      await service.issue({ orderId });
      // The natural way to say "make sure it is all out there". Nothing is
      // left, so nothing moves — and it must not throw for that.
      await service.issue({ orderId });

      expect(await onHand(batchId, benchId)).toBe(8);
    });

    it('settles everything outstanding when no lines are named', async () => {
      const batchId = await seedBatch('CSO-SETTLE-ALL');
      const { orderId } = await newOrder(batchId, 9);

      await service.issue({ orderId });
      await service.settle({ orderId });

      expect(await onHand(batchId, benchId)).toBe(0);
      expect(await onHand(batchId, shelfId)).toBe(91);
    });
  });

  describe('through the schema', () => {
    it('reports the four quantities on the line', async () => {
      const batchId = await seedBatch('CSO-GRAPHQL');
      const { orderId, itemId } = await newOrder(batchId, 30);

      await service.issue({ orderId });
      await service.return({ orderId, items: [{ itemId, quantity: 4 }] });
      await service.settle({ orderId, items: [{ itemId, quantity: 6 }] });

      const result = await execute(`{
        consumptionOrder(id: "${orderId}") {
          key
          items {
            targetConsumedQuantity
            issuedQuantity
            returnedQuantity
            settledQuantity
            outstandingQuantity
            location { key }
            targetLocation { key }
          }
        }
      }`);

      expect(result.errors).toBeUndefined();

      const payload = result.data?.['consumptionOrder'] as {
        key: string;
        items: {
          targetConsumedQuantity: number;
          issuedQuantity: number;
          returnedQuantity: number;
          settledQuantity: number;
          outstandingQuantity: number;
          location: { key: string };
          targetLocation: { key: string };
        }[];
      };

      // `HelperService.getSeq` uses the service's prefix to name the sequence,
      // not to prefix the key; every order family's keys are `yyyyMMdd` plus a
      // four-digit serial.
      expect(payload.key).toMatch(/^\d{8}\d{4}$/);
      expect(payload.items).toHaveLength(1);
      expect(payload.items[0]).toEqual({
        targetConsumedQuantity: 30,
        issuedQuantity: 30,
        returnedQuantity: 4,
        settledQuantity: 6,
        outstandingQuantity: 20,
        location: { key: 'CSO-SHELF' },
        targetLocation: { key: 'CSO-BENCH' },
      });
    });
  });

  /*
   * Everything above drives the service directly, so the resolvers and the
   * `@WmsMutationEvent` interceptor around them were never executed — only
   * `operation-names.invariant.spec` knew the mutations existed at all.
   */
  describe('the mutations, through the schema', () => {
    it('runs the whole lifecycle and emits an event for each action', async () => {
      const batchId = await seedBatch('CSO-SCHEMA');

      const created = await execute(`mutation {
        createConsumptionOrder(
          description: "through the schema"
          items: [{
            materialId: "${materialId}"
            batchId: "${batchId}"
            locationId: "${shelfId}"
            targetLocationId: "${benchId}"
            quantity: 25
          }]
        ) { id items { id } }
      }`);

      expect(created.errors).toBeUndefined();

      const order = created.data?.['createConsumptionOrder'] as {
        id: string;
        items: { id: string }[];
      };

      const issued = await execute(
        `mutation { issueConsumptionOrder(orderId: "${order.id}") }`,
      );
      expect(issued.errors).toBeUndefined();
      expect(await onHand(batchId, benchId)).toBe(25);

      const returned = await execute(`mutation {
        returnConsumptionOrder(
          orderId: "${order.id}"
          items: [{ itemId: "${order.items[0].id}", quantity: 5 }]
        )
      }`);
      expect(returned.errors).toBeUndefined();

      const settled = await execute(
        `mutation { settleConsumptionOrder(orderId: "${order.id}") }`,
      );
      expect(settled.errors).toBeUndefined();

      expect(await onHand(batchId, benchId)).toBe(0);
      expect(await onHand(batchId, shelfId)).toBe(80);

      // The three `stock.*` events the interceptor path is supposed to flush.
      expect(stockEvents).toEqual([
        'stock.issued',
        'stock.returned',
        'stock.consumed',
      ]);
    });

    it('surfaces a refusal as a GraphQL error rather than a silent no-op', async () => {
      const batchId = await seedBatch('CSO-SCHEMA-REFUSE');

      const created = await execute(`mutation {
        createConsumptionOrder(
          items: [{
            materialId: "${materialId}"
            batchId: "${batchId}"
            locationId: "${shelfId}"
            targetLocationId: "${benchId}"
            quantity: 5
          }]
        ) { id items { id } }
      }`);

      const order = created.data?.['createConsumptionOrder'] as {
        id: string;
        items: { id: string }[];
      };

      const result = await execute(`mutation {
        issueConsumptionOrder(
          orderId: "${order.id}"
          items: [{ itemId: "${order.items[0].id}", quantity: 6 }]
        )
      }`);

      expect(result.errors?.[0].message).toMatch(/left to issue/);
      expect(await onHand(batchId, benchId)).toBe(0);
    });

    it('lists a page of orders through the schema', async () => {
      /*
       * The query the list page actually sends, with the pagination arguments
       * it actually sends. `PaginationArgs` has no defaults, so a schema test
       * that omits them never reaches the `SELECT DISTINCT` rewrite that made
       * this crash in a browser.
       */
      const result = await execute(`{
        consumptionOrders(offset: 0, limit: 5) {
          total
          items { key items { issuedQuantity outstandingQuantity } }
        }
      }`);

      expect(result.errors).toBeUndefined();

      const payload = result.data?.['consumptionOrders'] as {
        total: number;
        items: unknown[];
      };

      expect(payload.total).toBeGreaterThan(0);
      expect(payload.items.length).toBeLessThanOrEqual(5);
    });

    it('updates an order through the schema', async () => {
      const batchId = await seedBatch('CSO-SCHEMA-UPDATE');

      const created = await execute(`mutation {
        createConsumptionOrder(
          description: "before"
          items: [{
            materialId: "${materialId}"
            batchId: "${batchId}"
            locationId: "${shelfId}"
            quantity: 5
          }]
        ) { id }
      }`);

      const order = created.data?.['createConsumptionOrder'] as { id: string };

      const updated = await execute(`mutation {
        updateConsumptionOrder(id: "${order.id}", description: "after") {
          description
        }
      }`);

      expect(updated.errors).toBeUndefined();
      expect(
        (updated.data?.['updateConsumptionOrder'] as { description: string })
          .description,
      ).toBe('after');
    });
  });

  /*
   * Every case above hands the service its arguments in full, because a
   * resolver would. A consumer of @rytass/wms-module-core writes the call the
   * signature invites — with the optional parts left out — and that is the
   * shape no in-repo caller ever produces.
   */
  describe('called as published API', () => {
    // Its own order, so the describe passes when run on its own. The two list
    // assertions below used to depend on earlier `it` blocks having created
    // something, which is a quiet way for a suite to stop meaning anything when
    // someone runs a single test.
    beforeAll(async () => {
      const batchId = await seedBatch('CSO-PUBLISHED-SEED');
      await newOrder(batchId, 3);
    });

    it('lists orders with no filter, pagination or flags', async () => {
      const [items, total] = await service.findMany({});

      expect(total).toBeGreaterThan(0);
      expect(items.length).toBe(total);
    });

    /*
     * The unpaginated call above cannot see this: asking for a page makes
     * TypeORM wrap the joined query in a `SELECT DISTINCT` over the root ids,
     * and an ordering expressed as raw SQL rather than a property path does not
     * survive that rewrite. It failed with
     * `column distinctAlias.consumption_"createdAt" does not exist` — on the
     * first query the list page ever sent.
     */
    it('lists a page of orders, which is what a list page actually asks for', async () => {
      const [items, total] = await service.findMany({ offset: 0, limit: 2 });

      expect(total).toBeGreaterThan(0);
      expect(items.length).toBeLessThanOrEqual(2);
    });

    it('pages a filtered list too', async () => {
      const [items] = await service.findMany({
        offset: 0,
        limit: 2,
        materialId,
      });

      expect(items.length).toBeLessThanOrEqual(2);
    });

    it('reads progress without being handed a manager', async () => {
      const batchId = await seedBatch('CSO-PUBLISHED');
      const { orderId } = await newOrder(batchId, 7);

      const progress = await service.getProgress(orderId);

      expect(progress).toHaveLength(1);
      expect(progress[0].outstanding).toBe(0);
    });

    it('returns with no line list at all', async () => {
      const batchId = await seedBatch('CSO-PUBLISHED-RETURN');
      const { orderId } = await newOrder(batchId, 7);

      await service.issue({ orderId });

      await expect(service.return({ orderId })).resolves.toBe(true);
      expect(await onHand(batchId, benchId)).toBe(0);
      expect(await onHand(batchId, shelfId)).toBe(100);
    });

    it('creates an order with no description and no createdBy', async () => {
      const batchId = await seedBatch('CSO-PUBLISHED-BARE');

      const order = await service.createConsumptionOrder({
        items: [
          {
            materialId,
            batchId,
            locationId: shelfId,
            targetLocationId: benchId,
            quantity: 2,
          },
        ],
      });

      expect(order.description).toBeNull();
      expect(order.createdBy).toBeNull();
    });

    it('records createdBy when it is given', async () => {
      const batchId = await seedBatch('CSO-PUBLISHED-AUTHOR');

      const order = await service.createConsumptionOrder({
        createdBy: 'operator-7',
        items: [
          {
            materialId,
            batchId,
            locationId: shelfId,
            targetLocationId: benchId,
            quantity: 2,
          },
        ],
      });

      expect(order.createdBy).toBe('operator-7');
    });

    it('removes an order that has not moved anything', async () => {
      const batchId = await seedBatch('CSO-PUBLISHED-REMOVE');
      const { orderId } = await newOrder(batchId, 4);

      await expect(service.removeConsumptionOrder(orderId)).resolves.toBe(true);

      const [items] = await service.findMany({});
      expect(items.map(({ id }) => id)).not.toContain(orderId);
    });

    it('refuses to remove an order that has moved stock', async () => {
      const batchId = await seedBatch('CSO-PUBLISHED-KEEP');
      const { orderId } = await newOrder(batchId, 4);

      await service.issue({ orderId });

      // The guard exists precisely so a settled movement keeps the document
      // that explains it. Nothing exercised it before.
      await expect(service.removeConsumptionOrder(orderId)).rejects.toThrow(
        /already moved stock/,
      );
    });

    it('issues with no line list at all', async () => {
      const batchId = await seedBatch('CSO-PUBLISHED-ISSUE');
      const { orderId } = await newOrder(batchId, 7);

      await expect(service.issue({ orderId })).resolves.toBe(true);
      expect(await onHand(batchId, benchId)).toBe(7);
    });
  });
});
