import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GraphQLModule, GraphQLSchemaHost } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from 'pg';
import { DataSource, Like } from 'typeorm';
import { ExecutionResult, GraphQLSchema, graphql } from 'graphql';
import { WarehouseMapEntity } from '@rytass/wms-base-nestjs-module/models/warehouse-map.entity';
import {
  LOCATION_MAP_PREVIEW_MAX_DEPTH,
  WarehouseMapDataService,
  WmsEntities,
} from '@rytass/wms-module-core';
import { WmsModuleGraphqlModule } from './graphql.module';
import { LoaderService, createWmsLoaders } from './helpers';

/**
 * Integration suite for `locationMapPreview`: where a location is drawn, and the
 * chain of maps that leads from the root down to it.
 *
 * Model: a location is a range (id = location key) on the map that draws it. A
 * location's drill-down map has id = location key, so a map's parent is whichever
 * map holds a range with the map's id.
 *
 * Requires a reachable PostgreSQL; override with WMS_TEST_DB_* env vars.
 */
const DB_HOST = process.env['WMS_TEST_DB_HOST'] ?? 'localhost';
const DB_PORT = Number(process.env['WMS_TEST_DB_PORT'] ?? 5432);
const DB_USER =
  process.env['WMS_TEST_DB_USER'] ?? process.env['USER'] ?? 'postgres';
const DB_PASS = process.env['WMS_TEST_DB_PASS'];
const DB_NAME = process.env['WMS_TEST_DB_NAME'] ?? 'wms_module_graphql_test';
// Own prefix: other specs sweep `ITEST-%` in the shared database.
const PREFIX = 'ITEST-LMP-';

const ensureDatabase = async (): Promise<void> => {
  const client = new Client({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASS,
    database: 'postgres',
  });

  await client.connect();

  try {
    const { rowCount } = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [DB_NAME],
    );

    if (!rowCount) await client.query(`CREATE DATABASE "${DB_NAME}"`);
  } finally {
    await client.end();
  }
};

interface PreviewNode {
  readonly locationKey: string;
  readonly mapKey: string;
  readonly path: readonly string[];
  readonly mapData: { readonly id: string; readonly [field: string]: unknown };
}

describe('locationMapPreview (integration)', () => {
  let app: INestApplication;
  let schema: GraphQLSchema;
  let loaderService: LoaderService;
  let dataSource: DataSource;
  let service: WarehouseMapDataService;

  const execute = async (
    source: string,
  ): Promise<ExecutionResult<Record<string, unknown>>> =>
    graphql({
      schema,
      source,
      contextValue: { ...createWmsLoaders(loaderService) },
    }) as Promise<ExecutionResult<Record<string, unknown>>>;

  const rectangle = (id: string): Record<string, unknown> => ({
    id,
    type: 'RECTANGLE',
    color: '#000000',
    x: 0,
    y: 0,
    width: 10,
    height: 10,
  });

  // Each map id is also a range-free drill-down target; ranges are the locations
  // (or child maps) drawn on it.
  const seedMap = async (
    id: string,
    rangeIds: readonly string[],
  ): Promise<void> => {
    const repository = dataSource.getRepository(
      app.get(WmsEntities).warehouseMap,
    );

    await repository.save(
      repository.create({
        id,
        mapData: {
          id,
          backgrounds: [],
          ranges: rangeIds.map(rectangle),
        } as unknown as WarehouseMapEntity['mapData'],
      }),
    );
  };

  beforeAll(async () => {
    await ensureDatabase();

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
    dataSource = app.get(DataSource);
    service = app.get(WarehouseMapDataService);

    await dataSource
      .getRepository(app.get(WmsEntities).warehouseMap)
      .delete({ id: Like(`${PREFIX}%`) });

    // Root floor plan draws location R-LOC; no drill-down map exists yet.
    await seedMap(`${PREFIX}R-FLOOR`, [`${PREFIX}R-LOC`]);

    // Two levels: FLOOR draws N-A, whose drill-down map A draws N-B.
    await seedMap(`${PREFIX}N-FLOOR`, [`${PREFIX}N-A`]);
    await seedMap(`${PREFIX}N-A`, [`${PREFIX}N-B`]);

    // Same location drawn on two maps: the lowest map id wins (byte order).
    await seedMap(`${PREFIX}MM-Z`, [`${PREFIX}MM-LOC`]);
    await seedMap(`${PREFIX}MM-B`, [`${PREFIX}MM-LOC`]);

    // Corrupt data: X and Y each claim the other as parent.
    await seedMap(`${PREFIX}CY-X`, [`${PREFIX}CY-LOC`, `${PREFIX}CY-Y`]);
    await seedMap(`${PREFIX}CY-Y`, [`${PREFIX}CY-X`]);

    // A chain deeper than the walk limit: D-00 draws D-01 draws ... D-LOC.
    const depthIds = Array.from(
      { length: LOCATION_MAP_PREVIEW_MAX_DEPTH + 3 },
      (_, index) => `${PREFIX}D-${String(index).padStart(2, '0')}`,
    );

    await Promise.all(
      depthIds.map((id, index) =>
        seedMap(id, [depthIds[index + 1] ?? `${PREFIX}D-LOC`]),
      ),
    );
  });

  afterAll(async () => {
    if (dataSource) {
      await dataSource
        .getRepository(app.get(WmsEntities).warehouseMap)
        .delete({ id: Like(`${PREFIX}%`) });
    }

    await app?.close();
  });

  describe('WarehouseMapDataService.findLocationMapPreview', () => {
    it('returns a root-level location with a one-element path', async () => {
      const preview = await service.findLocationMapPreview(`${PREFIX}R-LOC`);

      expect(preview?.locationKey).toBe(`${PREFIX}R-LOC`);
      expect(preview?.mapKey).toBe(`${PREFIX}R-FLOOR`);
      expect(preview?.path).toEqual([`${PREFIX}R-FLOOR`]);
      expect(preview?.mapData.id).toBe(`${PREFIX}R-FLOOR`);
    });

    it('walks up through two levels, root first', async () => {
      const preview = await service.findLocationMapPreview(`${PREFIX}N-B`);

      expect(preview?.mapKey).toBe(`${PREFIX}N-A`);
      expect(preview?.path).toEqual([`${PREFIX}N-FLOOR`, `${PREFIX}N-A`]);
      expect(preview?.mapData.id).toBe(`${PREFIX}N-A`);
    });

    it('returns null for a location drawn on no map', async () => {
      await expect(
        service.findLocationMapPreview(`${PREFIX}NONE`),
      ).resolves.toBeNull();
    });

    it('picks the lowest map id when a location is drawn on several maps', async () => {
      const preview = await service.findLocationMapPreview(`${PREFIX}MM-LOC`);

      expect(preview?.mapKey).toBe(`${PREFIX}MM-B`);
      expect(preview?.path).toEqual([`${PREFIX}MM-B`]);
    });

    it('terminates on a parent cycle instead of looping', async () => {
      const preview = await service.findLocationMapPreview(`${PREFIX}CY-LOC`);

      expect(preview?.mapKey).toBe(`${PREFIX}CY-X`);
      expect(preview?.path).toEqual([`${PREFIX}CY-Y`, `${PREFIX}CY-X`]);
    });
  });

  describe('depth limit', () => {
    it(`stops after ${LOCATION_MAP_PREVIEW_MAX_DEPTH} maps`, async () => {
      const preview = await service.findLocationMapPreview(`${PREFIX}D-LOC`);
      const last = `${PREFIX}D-${String(LOCATION_MAP_PREVIEW_MAX_DEPTH + 2)}`;

      expect(preview?.mapKey).toBe(last);
      expect(preview?.path).toHaveLength(LOCATION_MAP_PREVIEW_MAX_DEPTH);
      expect(preview?.path.at(-1)).toBe(last);
    });
  });

  describe('GraphQL locationMapPreview', () => {
    it('returns the preview with its path and map data', async () => {
      const result = await execute(`
        query {
          locationMapPreview(key: "${PREFIX}N-B") {
            locationKey
            mapKey
            path
            mapData {
              id
              backgrounds { id }
              ranges {
                ... on MapRectangleRangeDto { id type x y width height }
                ... on MapPolygonRangeDto { id type points { x y } }
              }
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      expect(result.data?.['locationMapPreview']).toEqual({
        locationKey: `${PREFIX}N-B`,
        mapKey: `${PREFIX}N-A`,
        path: [`${PREFIX}N-FLOOR`, `${PREFIX}N-A`],
        mapData: {
          id: `${PREFIX}N-A`,
          backgrounds: [],
          ranges: [
            {
              id: `${PREFIX}N-B`,
              type: 'RECTANGLE',
              x: 0,
              y: 0,
              width: 10,
              height: 10,
            },
          ],
        },
      } satisfies PreviewNode);
    });

    it('returns null, not an error, for a location on no map', async () => {
      const result = await execute(`
        query {
          locationMapPreview(key: "${PREFIX}NONE") { mapKey }
        }
      `);

      expect(result.errors).toBeUndefined();
      expect(result.data?.['locationMapPreview']).toBeNull();
    });
  });
});
