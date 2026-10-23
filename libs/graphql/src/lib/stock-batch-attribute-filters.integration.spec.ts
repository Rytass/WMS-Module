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
  StockEntityClass,
  StockService,
  WmsEntities,
} from '@rytass/wms-module-core';
import { WmsModuleGraphqlModule } from './graphql.module';
import { LoaderService, createWmsLoaders } from './helpers';

/**
 * Vendor / customer / sale order filters on stock.
 *
 * These four attributes have been on the stock list since it was written, but
 * only as columns — there was no way to ask for them. They live on the *batch*,
 * not on stock, so the filter needs its own join; get that wrong and the query
 * either explodes or, worse, quietly returns every row.
 *
 * The exact-match rule is the other thing worth pinning: 'SO-1' must not drag in
 * 'SO-10'. A substring match here would hand a salesperson someone else's order
 * and look entirely plausible.
 *
 * Requires a reachable PostgreSQL; override with WMS_TEST_DB_* env vars.
 */
const DB_HOST = process.env['WMS_TEST_DB_HOST'] ?? 'localhost';
const DB_PORT = Number(process.env['WMS_TEST_DB_PORT'] ?? 5432);
const DB_USER =
  process.env['WMS_TEST_DB_USER'] ?? process.env['USER'] ?? 'postgres';
const DB_PASS = process.env['WMS_TEST_DB_PASS'];
const DB_NAME =
  process.env['WMS_TEST_STOCK_FILTER_DB_NAME'] ??
  'wms_module_stock_filter_test';

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

interface AggregatedRow {
  readonly batch: { readonly key: string };
}

describe('stock batch-attribute filters (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let entities: WmsEntities;
  let stockService: StockService;
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

  /** The batch keys `aggregatedStocks` returns for a given argument list. */
  const batchKeysFor = async (args: string): Promise<string[]> => {
    const result = await execute(`{
      aggregatedStocks(${args}) { items { batch { key } } total }
    }`);

    expect(result.errors).toBeUndefined();

    const payload = result.data?.['aggregatedStocks'] as {
      items: AggregatedRow[];
    };

    return payload.items.map((item) => item.batch.key).sort();
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
    schema = app.get(GraphQLSchemaHost).schema;
    loaderService = app.get(LoaderService);

    const batchService = app.get(BatchService);

    const locationRepository = dataSource.getRepository<LocationEntityClass>(
      entities.location,
    );
    const location = await locationRepository.save(
      locationRepository.create({
        key: 'FILTER-LOCATION',
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
        key: 'FILTER-MATERIAL',
      } as DeepPartial<MaterialEntityClass>),
    );

    materialId = material.id;

    const batchRepository = dataSource.getRepository<BatchEntityClass>(
      entities.batch,
    );
    const orderRepository = dataSource.getRepository<OrderEntity>(
      entities.order,
    );

    /*
     * Three batches whose sale ids share a prefix. 'SO-1' vs 'SO-10' is the pair
     * that proves the match is exact rather than a substring.
     */
    const seeds = [
      {
        key: 'BATCH-A',
        vendorId: 'V-1',
        customerId: 'C-1',
        saleId: 'SO-1',
        saleSerialId: '1',
      },
      {
        key: 'BATCH-B',
        vendorId: 'V-2',
        customerId: 'C-1',
        saleId: 'SO-10',
        saleSerialId: '1',
      },
      {
        key: 'BATCH-C',
        vendorId: 'V-1',
        customerId: 'C-2',
        saleId: 'SO-1',
        saleSerialId: '2',
      },
    ];

    for (const seed of seeds) {
      const batch = await batchService.getBatch({
        key: seed.key,
        materialId,
      });

      await batchRepository.update(batch.id, {
        vendorId: seed.vendorId,
        customerId: seed.customerId,
        saleId: seed.saleId,
        saleSerialId: seed.saleSerialId,
      } as never);

      const baseOrder = await orderRepository.save(orderRepository.create({}));

      await dataSource.getRepository<StockEntityClass>(entities.stock).save({
        orderId: baseOrder.id,
        materialId,
        batchId: batch.id,
        locationId,
        loaderId: stockService.resolveLoaderId(null),
        quantity: 10,
      } as never);
    }
  });

  afterAll(async () => {
    await app?.close();
  });

  it('returns every position when no attribute filter is given', async () => {
    expect(await batchKeysFor('materialKey: "FILTER-MATERIAL"')).toEqual([
      'BATCH-A',
      'BATCH-B',
      'BATCH-C',
    ]);
  });

  it('filters by vendor', async () => {
    expect(await batchKeysFor('vendorId: "V-1"')).toEqual([
      'BATCH-A',
      'BATCH-C',
    ]);
  });

  it('filters by customer', async () => {
    expect(await batchKeysFor('customerId: "C-1"')).toEqual([
      'BATCH-A',
      'BATCH-B',
    ]);
  });

  it('matches the sale order exactly, so SO-1 does not pull in SO-10', async () => {
    expect(await batchKeysFor('saleId: "SO-1"')).toEqual([
      'BATCH-A',
      'BATCH-C',
    ]);
  });

  it('combines the attributes with AND', async () => {
    expect(await batchKeysFor('saleId: "SO-1", saleSerialId: "2"')).toEqual([
      'BATCH-C',
    ]);
  });

  it('combines an attribute with the existing key filters', async () => {
    expect(
      await batchKeysFor('materialKey: "FILTER-MATERIAL", vendorId: "V-2"'),
    ).toEqual(['BATCH-B']);
  });

  it('returns nothing for an attribute nobody carries', async () => {
    expect(await batchKeysFor('vendorId: "V-404"')).toEqual([]);
  });

  it('applies the same filters to the material-grouped query', async () => {
    const result = await execute(`{
      stocksGroupedByMaterial(vendorId: "V-2") { items { key } total }
    }`);

    expect(result.errors).toBeUndefined();

    const payload = result.data?.['stocksGroupedByMaterial'] as {
      items: { key: string }[];
      total: number;
    };

    expect(payload.items.map(({ key }) => key)).toEqual(['FILTER-MATERIAL']);
  });

  /*
   * Everything above enters through the GraphQL schema, and every resolver on
   * the way in supplies `aggregated: true` itself. That makes a whole class of
   * defect invisible from here: anything a *published* service signature allows
   * but no in-repo caller ever produces. `findAggregatedStocks` used to read
   * `options.aggregated` for its inner subquery while hard-wiring the outer
   * projection, so the most natural call a consumer could write — the one the
   * optional `aggregated?: boolean` invites — died on
   * `column agg."saleSerialId" does not exist`.
   *
   * These two call the service the way a consumer of @rytass/wms-module-core
   * does: directly, with the argument left out.
   */
  describe('StockService.findAggregatedStocks called as published API', () => {
    it('aggregates when `aggregated` is omitted entirely', async () => {
      const [items, total] = await stockService.findAggregatedStocks({});

      expect(total).toBe(3);
      expect(items.map((item) => item.saleSerialId).sort()).toEqual([
        '1',
        '1',
        '2',
      ]);
      expect(items.every((item) => Number(item.quantity) === 10)).toBe(true);
    });

    it('aggregates even when `aggregated: false` is passed', async () => {
      const [items, total] = await stockService.findAggregatedStocks({
        aggregated: false,
      });

      expect(total).toBe(3);
      expect(items.map((item) => item.vendorId).sort()).toEqual([
        'V-1',
        'V-1',
        'V-2',
      ]);
    });
  });
});
