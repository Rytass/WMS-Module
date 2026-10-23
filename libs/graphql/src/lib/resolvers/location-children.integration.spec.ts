import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GraphQLModule, GraphQLSchemaHost } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from 'pg';
import { DataSource, Logger as TypeOrmLogger } from 'typeorm';
import { ExecutionResult, GraphQLSchema, graphql } from 'graphql';
import { LocationEntityClass } from '@rytass/wms-module-core';
import { WmsModuleGraphqlModule } from '../graphql.module';
import { LoaderService, createWmsLoaders } from '../helpers';

/**
 * Regression suite for `LocationDto.children`, which the schema declares as a
 * non-nullable list. Before the fix the resolver returned the TypeORM relation
 * verbatim, so every code path that did not eager-load it failed the whole query
 * with "Cannot return null for non-nullable field LocationDto.children."
 *
 * Requires a reachable PostgreSQL; override with WMS_TEST_DB_* env vars.
 */
const DB_HOST = process.env['WMS_TEST_DB_HOST'] ?? 'localhost';
const DB_PORT = Number(process.env['WMS_TEST_DB_PORT'] ?? 5432);
const DB_USER =
  process.env['WMS_TEST_DB_USER'] ?? process.env['USER'] ?? 'postgres';
const DB_PASS = process.env['WMS_TEST_DB_PASS'];
const KEY_PREFIX = 'ITEST';
const DB_NAME = process.env['WMS_TEST_DB_NAME'] ?? 'wms_module_graphql_test';

class RecordingLogger implements TypeOrmLogger {
  private records: string[] = [];

  reset(): void {
    this.records = [];
  }

  get queries(): readonly string[] {
    return this.records;
  }

  logQuery(query: string): void {
    this.records = [...this.records, query];
  }

  logQueryError(): void {
    // no-op — assertions only care about the executed statements
  }

  logQuerySlow(): void {
    // no-op
  }

  logSchemaBuild(): void {
    // no-op
  }

  logMigration(): void {
    // no-op
  }

  log(): void {
    // no-op
  }
}

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

interface LocationNode {
  readonly id: string;
  readonly key: string;
  readonly children?: readonly { readonly id: string; readonly key: string }[];
  readonly parent?: LocationNode | null;
}

describe('LocationDto.children (integration)', () => {
  const logger = new RecordingLogger();

  let app: INestApplication;
  let schema: GraphQLSchema;
  let loaderService: LoaderService;
  let dataSource: DataSource;

  const execute = async (
    source: string,
  ): Promise<ExecutionResult<Record<string, unknown>>> =>
    graphql({
      schema,
      source,
      contextValue: { ...createWmsLoaders(loaderService) },
    }) as Promise<ExecutionResult<Record<string, unknown>>>;

  const seed = async (
    prefix: string,
  ): Promise<{
    root: string;
    childA: string;
    childB: string;
    leaf: string;
  }> => {
    const repository = dataSource.getRepository(LocationEntityClass);

    const root = await repository.save(
      repository.create({
        key: `${KEY_PREFIX}-${prefix}-ROOT`,
        description: 'root',
        isActive: true,
      }),
    );

    // Saved out of alphabetical order so the `ORDER BY key` guarantee is real.
    const childB = await repository.save(
      repository.create({
        key: `${KEY_PREFIX}-${prefix}-CHILD-B`,
        description: 'child b',
        isActive: true,
        parent: root,
      }),
    );

    const childA = await repository.save(
      repository.create({
        key: `${KEY_PREFIX}-${prefix}-CHILD-A`,
        description: 'child a',
        isActive: true,
        parent: root,
      }),
    );

    const leaf = await repository.save(
      repository.create({
        key: `${KEY_PREFIX}-${prefix}-LEAF`,
        description: 'leaf',
        isActive: true,
      }),
    );

    return {
      root: root.id,
      childA: childA.id,
      childB: childB.id,
      leaf: leaf.id,
    };
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
          logging: ['query'],
          logger,
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

    // Keys are unique, so a previous run's fixtures have to go. Parents and
    // children disappear in one statement — PostgreSQL evaluates the self
    // referencing FK after the statement completes.
    await dataSource.query('DELETE FROM locations WHERE "key" LIKE $1', [
      `${KEY_PREFIX}-%`,
    ]);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('returns every child of a parent, ordered by key', async () => {
    const { root } = await seed('T1');

    const result = await execute(`
      query {
        location(id: "${root}") {
          id
          key
          children { id key }
        }
      }
    `);

    expect(result.errors).toBeUndefined();

    const location = result.data?.['location'] as LocationNode;

    expect(location.children?.map(({ key }) => key)).toEqual([
      `${KEY_PREFIX}-T1-CHILD-A`,
      `${KEY_PREFIX}-T1-CHILD-B`,
    ]);
  });

  it('returns an empty list for a leaf location without GraphQL errors', async () => {
    const { leaf } = await seed('T2');

    const result = await execute(`
      query {
        location(id: "${leaf}") {
          id
          children { id key }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    expect((result.data?.['location'] as LocationNode).children).toEqual([]);
  });

  it('resolves children from a parent whose relation was never loaded', async () => {
    const { childA } = await seed('T3');

    // `LocationDto.parent` comes from `batchSingle`, so the returned entity has
    // no `children` relation at all — the exact shape that used to throw.
    const result = await execute(`
      query {
        location(id: "${childA}") {
          parent {
            key
            children { id key }
          }
        }
      }
    `);

    expect(result.errors).toBeUndefined();

    const parent = (result.data?.['location'] as LocationNode).parent;

    expect(parent?.key).toBe(`${KEY_PREFIX}-T3-ROOT`);
    expect(parent?.children?.map(({ key }) => key)).toEqual([
      `${KEY_PREFIX}-T3-CHILD-A`,
      `${KEY_PREFIX}-T3-CHILD-B`,
    ]);
  });

  it('resolves children on a freshly created location', async () => {
    const result = await execute(`
      mutation {
        createLocation(key: "${KEY_PREFIX}-T4-ROOT", description: "created") {
          id
          key
          children { id key }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    expect((result.data?.['createLocation'] as LocationNode).children).toEqual(
      [],
    );
  });

  it('serves the reported repro query for the whole location list', async () => {
    const { root, leaf } = await seed('T5');

    const result = await execute(`
      query LocationChildrenRegression {
        locations(offset: 0, limit: 1000, isActive: true) {
          items {
            id
            key
            children { id key }
          }
        }
      }
    `);

    expect(result.errors).toBeUndefined();

    const { items } = result.data?.['locations'] as {
      items: readonly LocationNode[];
    };
    const byId = new Map(items.map((item) => [item.id, item]));

    expect(byId.get(root)?.children?.map(({ key }) => key)).toEqual([
      `${KEY_PREFIX}-T5-CHILD-A`,
      `${KEY_PREFIX}-T5-CHILD-B`,
    ]);
    expect(byId.get(leaf)?.children).toEqual([]);
  });

  it('batches children lookups into a single query (no N+1)', async () => {
    const first = await seed('T6A');
    const second = await seed('T6B');
    const third = await seed('T6C');

    logger.reset();

    const result = await execute(`
      query {
        locations(offset: 0, limit: 1000, isActive: true) {
          items { id key children { id key } }
        }
      }
    `);

    expect(result.errors).toBeUndefined();

    const childrenQueries = logger.queries.filter((query) =>
      query.includes('"parentId" IN ('),
    );

    expect(childrenQueries).toHaveLength(1);

    const { items } = result.data?.['locations'] as {
      items: readonly LocationNode[];
    };
    const byId = new Map(items.map((item) => [item.id, item]));

    [first, second, third].forEach(({ root }) => {
      expect(byId.get(root)?.children).toHaveLength(2);
    });
  });
});
