import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GraphQLModule, GraphQLSchemaHost } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from 'pg';
import { DataSource, type DeepPartial } from 'typeorm';
import { graphql, type GraphQLSchema } from 'graphql';
import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import {
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
 * Which materials `stocksGroupedByMaterial` lists, and what its `total` counts.
 *
 * Written against the two-query implementation (distinct material ids, then
 * `material.id IN (...)`) before it became one grouped SQL, to pin the
 * membership rule the rewrite had to keep:
 *
 * - a material is listed when **any** (material, batch, location, loader,
 *   status) position of it nets to non-zero — not when the material as a whole
 *   does. A material at +5 in one location and -5 in another is listed;
 * - a material whose every position nets to zero is not;
 * - a soft-deleted material is not, even with stock;
 * - the stock filters narrow the positions first, then the rule applies.
 *
 * Requires a reachable PostgreSQL; override with WMS_TEST_DB_* env vars.
 */
const DB_HOST = process.env['WMS_TEST_DB_HOST'] ?? 'localhost';
const DB_PORT = Number(process.env['WMS_TEST_DB_PORT'] ?? 5432);
const DB_USER =
  process.env['WMS_TEST_DB_USER'] ?? process.env['USER'] ?? 'postgres';
const DB_PASS = process.env['WMS_TEST_DB_PASS'];
const DB_NAME =
  process.env['WMS_TEST_STOCKS_GROUPED_DB_NAME'] ??
  'wms_module_stocks_grouped_test';

const withMaintenanceClient = async (
  work: (client: Client) => Promise<void>,
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
    await work(client);
  } finally {
    await client.end();
  }
};

describe('stocksGroupedByMaterial membership and total (integration)', () => {
  let app: INestApplication;
  let schema: GraphQLSchema;
  let loaderService: LoaderService;
  let stockService: StockService;

  const keysOf = (items: readonly { key: string }[]): string[] =>
    items.map(({ key }) => key).sort();

  const query = async (
    args: string,
  ): Promise<{ keys: string[]; total: number }> => {
    const { data, errors } = await graphql({
      schema,
      source: `{ stocksGroupedByMaterial(${args}) { total items { key } } }`,
      contextValue: { ...createWmsLoaders(loaderService) },
    });

    if (errors?.length) throw errors[0];

    const list = (data as Record<string, unknown>)[
      'stocksGroupedByMaterial'
    ] as {
      total: number;
      items: { key: string }[];
    };

    return { keys: keysOf(list.items), total: list.total };
  };

  beforeAll(async () => {
    await withMaintenanceClient(async (client) => {
      await client.query(`DROP DATABASE IF EXISTS "${DB_NAME}" WITH (FORCE)`);
      await client.query(`CREATE DATABASE "${DB_NAME}"`);
    });

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

    schema = app.get(GraphQLSchemaHost).schema;
    loaderService = app.get(LoaderService);
    stockService = app.get(StockService);

    const dataSource = app.get(DataSource);
    const entities = app.get(WmsEntities);
    const batchService = app.get(BatchService);
    const locationRepository = dataSource.getRepository<LocationEntityClass>(
      entities.location,
    );
    const materialRepository = dataSource.getRepository<MaterialEntityClass>(
      entities.material,
    );
    const orderRepository = dataSource.getRepository<OrderEntity>(
      entities.order,
    );
    const stockRepository = dataSource.getRepository<StockEntityClass>(
      entities.stock,
    );

    const [locationA, locationB] = await locationRepository.save(
      ['grplocaa', 'grplocbb'].map((key) =>
        locationRepository.create({
          key,
          description: key,
          isActive: true,
        } as DeepPartial<LocationEntityClass>),
      ),
    );
    const locations = { A: locationA.id, B: locationB.id } as const;

    // material key → its stock movements (location, quantity), all one batch.
    const fixtures: Readonly<
      Record<string, readonly (readonly ['A' | 'B', number])[]>
    > = {
      grpmat01: [
        ['A', 4],
        ['B', 6],
      ],
      grpmat02: [['A', 3]],
      // Nets to zero as a material, but each position is non-zero: listed.
      grpmat03: [
        ['A', 5],
        ['B', -5],
      ],
      // Every position nets to zero: not listed.
      grpmat04: [
        ['A', 5],
        ['A', -5],
      ],
      // Soft-deleted below: not listed.
      grpmat05: [['A', 2]],
      grpmat06: [['B', 7]],
    };

    const materials = await Object.entries(fixtures).reduce<
      Promise<Map<string, string>>
    >(async (acc, [key, movements]) => {
      const map = await acc;
      const material = await materialRepository.save(
        materialRepository.create({ key } as DeepPartial<MaterialEntityClass>),
      );
      const batch = await batchService.getBatch({
        key: `${key}b`,
        materialId: material.id,
      });

      await movements.reduce<Promise<void>>(
        async (previous, [location, quantity]) => {
          await previous;

          const order = await orderRepository.save(orderRepository.create({}));

          await stockRepository.save({
            orderId: order.id,
            materialId: material.id,
            batchId: batch.id,
            locationId: locations[location],
            loaderId: stockService.resolveLoaderId(null),
            quantity,
          } as never);
        },
        Promise.resolve(),
      );

      return new Map([...map, [key, material.id]]);
    }, Promise.resolve(new Map()));

    await materialRepository.softDelete(materials.get('grpmat05') as string);
  });

  afterAll(async () => {
    await app?.close();
    await withMaintenanceClient(async (client) => {
      await client.query(`DROP DATABASE IF EXISTS "${DB_NAME}" WITH (FORCE)`);
    });
  });

  it('lists materials with any non-zero position, and counts exactly those', async () => {
    expect(await query('materialKey: "grpmat"')).toEqual({
      keys: ['grpmat01', 'grpmat02', 'grpmat03', 'grpmat06'],
      total: 4,
    });
  });

  it('applies the stock filters before the non-zero rule', async () => {
    expect(
      await query('materialKey: "grpmat", locationKey: "grplocaa"'),
    ).toEqual({ keys: ['grpmat01', 'grpmat02', 'grpmat03'], total: 3 });
    expect(
      await query('materialKey: "grpmat", locationKey: "grplocbb"'),
    ).toEqual({ keys: ['grpmat01', 'grpmat03', 'grpmat06'], total: 3 });
  });

  it('pages through the same set, with total unaffected by the page', async () => {
    const pages = await Promise.all(
      [0, 2].map((offset) =>
        query(`materialKey: "grpmat", offset: ${offset}, limit: 2`),
      ),
    );

    pages.forEach(({ keys, total }) => {
      expect(total).toBe(4);
      expect(keys).toHaveLength(2);
    });
    expect(pages.flatMap(({ keys }) => keys).sort()).toEqual([
      'grpmat01',
      'grpmat02',
      'grpmat03',
      'grpmat06',
    ]);
  });

  it('returns an empty page past the end, with the total intact', async () => {
    expect(await query('materialKey: "grpmat", offset: 10, limit: 2')).toEqual({
      keys: [],
      total: 4,
    });
  });

  it('returns nothing, and a zero total, when no material matches', async () => {
    expect(await query('materialKey: "nomatch"')).toEqual({
      keys: [],
      total: 0,
    });
  });

  it('gives the same answer called directly with no options', async () => {
    const [items, total] = await stockService.findManyGroupedByMaterialId({});

    expect(keysOf(items)).toEqual([
      'grpmat01',
      'grpmat02',
      'grpmat03',
      'grpmat06',
    ]);
    expect(total).toBe(4);
  });
});
