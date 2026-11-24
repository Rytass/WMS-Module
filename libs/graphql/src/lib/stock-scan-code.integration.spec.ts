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
  LocationService,
  LocationEntityClass,
  MaterialEntityClass,
  StockEntityClass,
  StockService,
  WmsEntities,
} from '@rytass/wms-module-core';
import { WmsModuleGraphqlModule } from './graphql.module';
import { LoaderService, createWmsLoaders } from './helpers';

/**
 * `scanCode` on the stock queries: what a label scanner sends.
 *
 * The `*Key` filters are substring searches for a person typing into a list
 * filter, so scanning `SCAN-M1` through them also returns `SCAN-M10` — a
 * plausible-looking wrong answer at the moment someone is about to move stock.
 * `scanCode` matches exactly, and resolves which kind of key the code is in a
 * fixed order: material, then batch, then location.
 *
 * Requires a reachable PostgreSQL; override with WMS_TEST_DB_* env vars.
 */
const DB_HOST = process.env['WMS_TEST_DB_HOST'] ?? 'localhost';
const DB_PORT = Number(process.env['WMS_TEST_DB_PORT'] ?? 5432);
const DB_USER =
  process.env['WMS_TEST_DB_USER'] ?? process.env['USER'] ?? 'postgres';
const DB_PASS = process.env['WMS_TEST_DB_PASS'];
const DB_NAME =
  process.env['WMS_TEST_SCAN_CODE_DB_NAME'] ?? 'wms_module_scan_code_test';

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

interface ScanRow {
  readonly material: { readonly key: string };
  readonly batch: { readonly key: string };
  readonly location: { readonly key: string };
}

const describeRow = (row: ScanRow): string =>
  `${row.material.key}|${row.batch.key}|${row.location.key}`;

describe('stock scanCode (integration)', () => {
  let app: INestApplication;
  let stockService: StockService;
  let schema: GraphQLSchema;
  let loaderService: LoaderService;
  let heldChildKey: string;
  let locationService: LocationService;

  const scan = async (
    args: string,
  ): Promise<{ readonly rows: string[]; readonly total: number }> => {
    const result = (await graphql({
      schema,
      source: `{
        aggregatedStocks(${args}) {
          items { material { key } batch { key } location { key } }
          total
        }
      }`,
      contextValue: { ...createWmsLoaders(loaderService) },
    })) as ExecutionResult<Record<string, unknown>>;

    expect(result.errors).toBeUndefined();

    const payload = result.data?.['aggregatedStocks'] as {
      items: ScanRow[];
      total: number;
    };

    return {
      rows: payload.items.map(describeRow).sort(),
      total: payload.total,
    };
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

    const dataSource = app.get(DataSource);
    const entities = app.get(WmsEntities);
    const batchService = app.get(BatchService);

    stockService = app.get(StockService);
    locationService = app.get(LocationService);
    schema = app.get(GraphQLSchemaHost).schema;
    loaderService = app.get(LoaderService);

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

    const locationIds = new Map<string, string>();

    // A-SCAN-LOC-A and SCAN-LOC-A2 contain SCAN-LOC-A, and the first sorts before
    // it: what a substring search returns ahead of the label actually scanned.
    for (const key of [
      'SCAN-LOC-A',
      'SCAN-LOC-B',
      'A-SCAN-LOC-A',
      'SCAN-LOC-A2',
    ]) {
      const location = await locationRepository.save(
        locationRepository.create({
          key,
          description: key,
          isActive: true,
        } as DeepPartial<LocationEntityClass>),
      );

      locationIds.set(key, location.id);
    }

    const materialIds = new Map<string, string>();

    for (const key of ['SCAN-M1', 'SCAN-M10', 'SCAN-M2']) {
      const material = await materialRepository.save(
        materialRepository.create({ key } as DeepPartial<MaterialEntityClass>),
      );

      materialIds.set(key, material.id);
    }

    /*
     * SCAN-B1 exists under both materials (a batch key is unique per material
     * only), and one batch of SCAN-M1 is literally keyed `SCAN-M10` — the case
     * that decides the material-before-batch precedence.
     */
    const seeds = [
      { material: 'SCAN-M1', batch: 'SCAN-B1', location: 'SCAN-LOC-A' },
      { material: 'SCAN-M1', batch: 'SCAN-B2', location: 'SCAN-LOC-B' },
      { material: 'SCAN-M1', batch: 'SCAN-M10', location: 'SCAN-LOC-B' },
      { material: 'SCAN-M10', batch: 'SCAN-B1', location: 'SCAN-LOC-A' },
    ];

    for (const seed of seeds) {
      const materialId = materialIds.get(seed.material) as string;
      const batch = await batchService.getBatch({
        key: seed.batch,
        materialId,
      });
      const order = await orderRepository.save(orderRepository.create({}));

      await stockRepository.save({
        orderId: order.id,
        materialId,
        batchId: batch.id,
        locationId: locationIds.get(seed.location),
        loaderId: stockService.resolveLoaderId(null),
        quantity: 10,
      } as never);
    }

    /*
     * SCAN-B3 was held whole: holding splits a child keyed
     * `SCAN-B3_<timestamp>` and moves the stock onto it, while every screen and
     * the printed label keep saying SCAN-B3.
     */
    const heldMaterialId = materialIds.get('SCAN-M2') as string;
    const heldParent = await batchService.getBatch({
      key: 'SCAN-B3',
      materialId: heldMaterialId,
    });
    const heldChild = await batchService.splitBatch({
      id: heldParent.id,
      held: true,
    });
    const heldOrder = await orderRepository.save(orderRepository.create({}));

    heldChildKey = heldChild.key;

    await stockRepository.save({
      orderId: heldOrder.id,
      materialId: heldMaterialId,
      batchId: heldChild.id,
      locationId: locationIds.get('SCAN-LOC-B'),
      loaderId: stockService.resolveLoaderId(null),
      quantity: 10,
    } as never);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('matches a material key exactly, so SCAN-M1 does not pull in SCAN-M10', async () => {
    expect((await scan('scanCode: "SCAN-M1"')).rows).toEqual([
      'SCAN-M1|SCAN-B1|SCAN-LOC-A',
      'SCAN-M1|SCAN-B2|SCAN-LOC-B',
      'SCAN-M1|SCAN-M10|SCAN-LOC-B',
    ]);
  });

  it('falls back to a batch key, across every material carrying it', async () => {
    expect((await scan('scanCode: "SCAN-B1"')).rows).toEqual([
      'SCAN-M10|SCAN-B1|SCAN-LOC-A',
      'SCAN-M1|SCAN-B1|SCAN-LOC-A',
    ]);
  });

  it('prefers the material reading when a code is both a material and a batch key', async () => {
    expect((await scan('scanCode: "SCAN-M10"')).rows).toEqual([
      'SCAN-M10|SCAN-B1|SCAN-LOC-A',
    ]);
  });

  it('falls back to a location key last', async () => {
    expect((await scan('scanCode: "SCAN-LOC-B"')).rows).toEqual([
      'SCAN-M1|SCAN-B2|SCAN-LOC-B',
      'SCAN-M1|SCAN-M10|SCAN-LOC-B',
      'SCAN-M2|SCAN-B3|SCAN-LOC-B',
    ]);
  });

  it('finds a batch by its label after a split moved the stock to a child', async () => {
    expect(heldChildKey).not.toBe('SCAN-B3');
    expect((await scan('scanCode: "SCAN-B3"')).rows).toEqual([
      'SCAN-M2|SCAN-B3|SCAN-LOC-B',
    ]);
    expect((await scan(`scanCode: "${heldChildKey}"`)).total).toBe(1);
  });

  it('returns nothing for a fragment or a different case', async () => {
    expect(await scan('scanCode: "SCAN-M"')).toEqual({ rows: [], total: 0 });
    expect(await scan('scanCode: "scan-m1"')).toEqual({ rows: [], total: 0 });
  });

  it('keeps total whole while a page is cut', async () => {
    const page = await scan('scanCode: "SCAN-M1", limit: 2, offset: 0');

    expect(page.rows).toHaveLength(2);
    expect(page.total).toBe(3);
  });

  describe('StockService.findAggregatedStocks called as published API', () => {
    it('applies scanCode with every other option left out', async () => {
      const [items, total] = await stockService.findAggregatedStocks({
        scanCode: 'SCAN-B1',
      });

      expect(total).toBe(2);
      expect(items).toHaveLength(2);
    });
  });

  describe('locations keys', () => {
    const locationKeys = async (args: string): Promise<string[]> => {
      const result = (await graphql({
        schema,
        source: `{ locations(${args}) { items { key } total } }`,
        contextValue: { ...createWmsLoaders(loaderService) },
      })) as ExecutionResult<Record<string, unknown>>;

      expect(result.errors).toBeUndefined();

      const payload = result.data?.['locations'] as {
        items: { key: string }[];
      };

      return payload.items.map((item) => item.key).sort();
    };

    it('matches exactly, where key returns every location containing the code', async () => {
      expect(await locationKeys('key: "SCAN-LOC-A"')).toEqual([
        'A-SCAN-LOC-A',
        'SCAN-LOC-A',
        'SCAN-LOC-A2',
      ]);
      expect(await locationKeys('keys: ["SCAN-LOC-A"]')).toEqual([
        'SCAN-LOC-A',
      ]);
    });

    it('is case-sensitive and finds nothing for a fragment', async () => {
      expect(await locationKeys('keys: ["scan-loc-a", "SCAN-LOC"]')).toEqual(
        [],
      );
    });

    it('takes several keys at once', async () => {
      expect(await locationKeys('keys: ["SCAN-LOC-A", "SCAN-LOC-B"]')).toEqual([
        'SCAN-LOC-A',
        'SCAN-LOC-B',
      ]);
    });

    it('applies keys through LocationService.findMany with every other option left out', async () => {
      const [items, total] = await locationService.findMany({
        keys: ['SCAN-LOC-B'],
      });

      expect(total).toBe(1);
      expect(items.map((item) => item.key)).toEqual(['SCAN-LOC-B']);

      const [none, noneTotal] = await locationService.findMany({ keys: [] });

      expect(noneTotal).toBe(0);
      expect(none).toEqual([]);
    });
  });
});
