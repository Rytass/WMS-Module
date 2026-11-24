import { Client } from 'pg';
import {
  TEST_DB_HOST,
  TEST_DB_PASS,
  TEST_DB_PORT,
  TEST_DB_USER,
  createTestDatabase,
  createWmsTestApp,
  seed,
  type WmsTestApp,
} from './testing';

const databaseExists = async (name: string): Promise<boolean> => {
  const client = new Client({
    host: TEST_DB_HOST,
    port: TEST_DB_PORT,
    user: TEST_DB_USER,
    password: TEST_DB_PASS,
    database: 'postgres',
  });

  await client.connect();

  try {
    const { rowCount } = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [name],
    );

    return rowCount === 1;
  } finally {
    await client.end();
  }
};

describe('test fixture', () => {
  it('names each database uniquely and removes it on request', async () => {
    const [a, b] = await Promise.all([
      createTestDatabase('fixture'),
      createTestDatabase('fixture'),
    ]);

    try {
      expect(a.name).not.toBe(b.name);
      expect(a.name).toContain(String(process.pid));
      expect(a.name.length).toBeLessThanOrEqual(63);
      await expect(databaseExists(a.name)).resolves.toBe(true);
    } finally {
      await Promise.all([a.drop(), b.drop()]);
    }

    await expect(databaseExists(a.name)).resolves.toBe(false);
    await expect(a.drop()).resolves.toBeUndefined();
  });

  it('turns a long, unsafe label into a valid identifier', async () => {
    const db = await createTestDatabase('Weird Label/with-symbols'.repeat(5));

    try {
      expect(db.name).toMatch(/^wms_t_[a-z0-9_]+$/);
      expect(db.name.length).toBeLessThanOrEqual(63);
    } finally {
      await db.drop();
    }
  });

  describe('createWmsTestApp', () => {
    let ctx: WmsTestApp;

    beforeAll(async () => {
      ctx = await createWmsTestApp({ label: 'fixture-app' });
    });

    afterAll(async () => {
      await ctx?.close();
    });

    it('boots WMS and serves GraphQL on its own database', async () => {
      const result = await ctx.execute('{ __typename }');

      expect(result.errors).toBeUndefined();
      expect(result.data).toEqual({ __typename: 'Query' });
    });

    it('seeds master data with unique keys', async () => {
      const seeder = seed(ctx);
      const material = await seeder.material();
      const other = await seeder.material();
      const location = await seeder.location();
      const batch = await seeder.batch({ materialId: material.id });

      expect(material.key).not.toBe(other.key);
      expect(location.id).toBeDefined();
      expect(batch.materialId).toBe(material.id);
    });

    it('removes its database when closed, and closing twice is harmless', async () => {
      const second = await createWmsTestApp({
        label: 'fixture-close',
        graphql: false,
      });
      const { name } = second.database;

      await expect(databaseExists(name)).resolves.toBe(true);
      await expect(second.execute('{ __typename }')).rejects.toThrow(
        /graphql: false/,
      );

      await second.close();
      await second.close();

      await expect(databaseExists(name)).resolves.toBe(false);
    });
  });
});
