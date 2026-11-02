import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from 'pg';
import { DataSource } from 'typeorm';
import {
  WmsModuleCoreModule,
  getWmsTablePrefix,
} from '@rytass/wms-module-core';

/**
 * Startup seeding of the default loader type, location and loader (B7).
 *
 * Several pods start at once. The seed used to be a plain find-then-insert on
 * the pool, and the keys carry no unique constraint, so two instances that both
 * found nothing both inserted: two `DEFAULT` locations, and each pod resolving
 * a different one as "the" default. It now runs in a transaction behind an
 * advisory lock. A host that seeds the defaults itself turns it off with
 * `seedDefaults: false`, and then a missing default must fail startup loudly
 * rather than surface later as a null location on the first movement.
 *
 * Requires a reachable PostgreSQL; override with WMS_TEST_DB_* env vars.
 */
const DB_HOST = process.env['WMS_TEST_DB_HOST'] ?? 'localhost';
const DB_PORT = Number(process.env['WMS_TEST_DB_PORT'] ?? 5432);
const DB_USER =
  process.env['WMS_TEST_DB_USER'] ?? process.env['USER'] ?? 'postgres';
const DB_PASS = process.env['WMS_TEST_DB_PASS'];
const DB_NAME =
  process.env['WMS_TEST_HOST_BOOT_DB_NAME'] ?? 'wms_module_host_boot_test';

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

const createApp = async ({
  synchronize,
  seedDefaults,
}: {
  synchronize: boolean;
  seedDefaults?: boolean;
}): Promise<INestApplication> => {
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
        synchronize,
        uuidExtension: 'uuid-ossp',
        // Fail fast instead of TypeOrmModule's retry loop when init throws.
        retryAttempts: 0,
      }),
      WmsModuleCoreModule.forRootAsync({
        useFactory: async () => ({}),
        defaultLoaderSerialId: 'DEFAULT',
        defaultLoaderTypeKey: 'DEFAULT',
        defaultLocationKey: 'DEFAULT',
        seedDefaults,
      }),
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.init();

  return app;
};

describe('default seeding at startup (integration)', () => {
  const apps: INestApplication[] = [];

  const defaultsCount = async (
    dataSource: DataSource,
  ): Promise<Record<string, number>> => {
    const count = async (entity: string, where: string): Promise<number> =>
      Number(
        (
          await dataSource.query<[{ count: string }]>(
            `SELECT COUNT(*) AS count FROM "${dataSource.getMetadata(getWmsTablePrefix() + entity).tablePath}" WHERE ${where}`,
          )
        )[0].count,
      );

    return {
      loaderTypes: await count('loader_types', `key = 'DEFAULT'`),
      locations: await count('locations', `key = 'DEFAULT'`),
      loaders: await count('loaders', `"serialId" = 'DEFAULT'`),
    };
  };

  const clearDefaults = async (dataSource: DataSource): Promise<void> => {
    for (const entity of ['loaders', 'loader_types', 'locations']) {
      await dataSource.query(
        `DELETE FROM "${dataSource.getMetadata(getWmsTablePrefix() + entity).tablePath}"`,
      );
    }
  };

  beforeAll(async () => {
    await resetDatabase();
    // One instance builds the schema; the concurrent ones below must not
    // race each other's `synchronize`, which is not what is under test.
    apps.push(await createApp({ synchronize: true }));
  });

  afterAll(async () => {
    await Promise.all(apps.map((app) => app.close()));
  });

  it('several instances starting at once create one of each default', async () => {
    const dataSource = apps[0].get(DataSource);
    await clearDefaults(dataSource);

    const started = await Promise.all(
      [1, 2, 3, 4].map(() => createApp({ synchronize: false })),
    );
    apps.push(...started);

    expect(await defaultsCount(dataSource)).toEqual({
      loaderTypes: 1,
      locations: 1,
      loaders: 1,
    });
  });

  it('seedDefaults: false leaves existing defaults alone and starts', async () => {
    const dataSource = apps[0].get(DataSource);
    const before = await defaultsCount(dataSource);

    apps.push(await createApp({ synchronize: false, seedDefaults: false }));

    expect(await defaultsCount(dataSource)).toEqual(before);
  });

  it('seedDefaults: false with the defaults missing fails startup with a clear error', async () => {
    const dataSource = apps[0].get(DataSource);
    await clearDefaults(dataSource);

    await expect(
      createApp({ synchronize: false, seedDefaults: false }),
    ).rejects.toThrow(
      /seedDefaults is false but the default loader type "DEFAULT" does not exist/,
    );

    expect(await defaultsCount(dataSource)).toEqual({
      loaderTypes: 0,
      locations: 0,
      loaders: 0,
    });
  });
});
