import { randomBytes } from 'node:crypto';
import { Client } from 'pg';
import type { DataSourceOptions } from 'typeorm';

/**
 * Connection settings, shared with every existing spec through the same
 * `WMS_TEST_DB_*` variables.
 */
export const TEST_DB_HOST = process.env['WMS_TEST_DB_HOST'] ?? 'localhost';
export const TEST_DB_PORT = Number(process.env['WMS_TEST_DB_PORT'] ?? 5432);
export const TEST_DB_USER =
  process.env['WMS_TEST_DB_USER'] ?? process.env['USER'] ?? 'postgres';
export const TEST_DB_PASS = process.env['WMS_TEST_DB_PASS'];

export interface TestDatabase {
  /** `wms_t_<label>_<pid>_<worker>_<random>`; unique per call, per process. */
  readonly name: string;
  readonly options: Extract<DataSourceOptions, { type: 'postgres' }>;
  /** Idempotent. Forces leftover connections closed, then removes the database. */
  drop(): Promise<void>;
}

const adminClient = (): Client =>
  new Client({
    host: TEST_DB_HOST,
    port: TEST_DB_PORT,
    user: TEST_DB_USER,
    password: TEST_DB_PASS,
    database: 'postgres',
  });

/**
 * A database nobody else is using.
 *
 * The legacy specs name theirs by hand (`wms_module_*_test`), recreate it on
 * every start and never clean up, so two sessions running the same spec wipe
 * each other and every run leaves one behind. This one is named from the label,
 * the process id, the jest worker id and a random suffix, and `drop()` removes it.
 *
 * Postgres caps identifiers at 63 bytes; the label is truncated to fit.
 */
export const createTestDatabase = async (
  label: string,
): Promise<TestDatabase> => {
  const safeLabel = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .slice(0, 24);
  const name = [
    'wms_t',
    safeLabel,
    process.pid,
    process.env['JEST_WORKER_ID'] ?? '0',
    randomBytes(3).toString('hex'),
  ].join('_');

  const client = adminClient();

  await client.connect();

  try {
    await client.query(`CREATE DATABASE "${name}"`);
  } finally {
    await client.end();
  }

  const options = {
    type: 'postgres',
    host: TEST_DB_HOST,
    port: TEST_DB_PORT,
    username: TEST_DB_USER,
    password: TEST_DB_PASS,
    database: name,
    autoLoadEntities: true,
    synchronize: true,
    uuidExtension: 'uuid-ossp',
  } as TestDatabase['options'];

  return {
    name,
    options,
    drop: async (): Promise<void> => {
      const remover = adminClient();

      await remover.connect();

      try {
        await remover.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
      } finally {
        await remover.end();
      }
    },
  };
};
