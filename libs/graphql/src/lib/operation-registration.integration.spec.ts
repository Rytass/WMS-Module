import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GraphQLModule, GraphQLSchemaHost } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from 'pg';
import { GraphQLSchema, printSchema } from 'graphql';
import {
  MaterialService,
  ReceiveInventoryOrderService,
} from '@rytass/wms-module-core';
import { WmsModuleGraphqlModule } from './graphql.module';
import { LoaderService, createWmsLoaders } from './helpers';

/**
 * The deployment switch that keeps an operation out of the schema entirely.
 *
 * `authChecker` and `beforeHooks` already let a consumer *refuse* an operation,
 * but the resolver stays compiled into the schema — so introspection, the
 * frontend's codegen and any security review still see a mutation that is
 * guaranteed to fail. This suite pins the stronger guarantee: the field is
 * absent from the built schema, while everything else — including the ability to
 * inject the corresponding service and drive it directly — is untouched.
 *
 * Pruning mutates process-global state (the resolver prototypes and
 * `TypeMetadataStorage`), so this file boots exactly **one** app. Jest gives each
 * test file a fresh module registry, which is what keeps the other suites clean.
 *
 * Requires a reachable PostgreSQL; override with WMS_TEST_DB_* env vars.
 */
const DB_HOST = process.env['WMS_TEST_DB_HOST'] ?? 'localhost';
const DB_PORT = Number(process.env['WMS_TEST_DB_PORT'] ?? 5432);
const DB_USER =
  process.env['WMS_TEST_DB_USER'] ?? process.env['USER'] ?? 'postgres';
const DB_PASS = process.env['WMS_TEST_DB_PASS'];
const DB_NAME =
  process.env['WMS_TEST_REGISTRATION_DB_NAME'] ??
  'wms_module_operation_registration_test';

/** Disabled by requirement name — takes every field carrying that requirement. */
const DISABLED_OPERATIONS = [
  'quality-inspection-order:inspect',
  'material:create',
] as const;

/** Disabled by field name — the finer-grained escape hatch. */
const DISABLED_FIELDS = ['availableLoaders'] as const;

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

describe('operation registration switches (integration)', () => {
  let app: INestApplication;
  let schema: GraphQLSchema;
  let sdl: string;

  const rootFieldNames = (kind: 'Query' | 'Mutation'): string[] => {
    const type =
      kind === 'Query' ? schema.getQueryType() : schema.getMutationType();

    return Object.keys(type?.getFields() ?? {});
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
          disabledOperations: [...DISABLED_OPERATIONS],
          disabledFields: [...DISABLED_FIELDS],
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
    sdl = printSchema(schema);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('drops the mutations whose requirement was disabled', () => {
    const mutations = rootFieldNames('Mutation');

    expect(mutations).not.toContain('inspectMaterials');
    expect(mutations).not.toContain('createMaterial');
  });

  it('keeps every other mutation on the same resource', () => {
    const mutations = rootFieldNames('Mutation');

    // `material:update` was not disabled, so it must survive even though its
    // sibling `material:create` is gone — proving the switch is per requirement
    // and not per resource or per resolver class.
    expect(mutations).toContain('updateMaterial');
    expect(mutations).toContain('scrapeMaterials');
    expect(mutations).toContain('splitBatch');
  });

  it('drops a single field named through `disabledFields`', () => {
    const queries = rootFieldNames('Query');

    expect(queries).not.toContain('availableLoaders');
    // The other `loader:read` queries share the requirement and must survive —
    // that asymmetry is the whole reason `disabledFields` exists.
    expect(queries).toContain('loaders');
  });

  it('leaves the disabled fields out of the printed SDL, not just the field map', () => {
    // Introspection and the emitted `schema.gql` both come from here, so this is
    // the assertion that matches what a consumer actually sees.
    expect(sdl).not.toMatch(/\binspectMaterials\b/);
    expect(sdl).not.toMatch(/\bcreateMaterial\b/);
    expect(sdl).not.toMatch(/\bavailableLoaders\b/);
    expect(sdl).toMatch(/\bupdateMaterial\b/);
  });

  it('still exposes the services behind the disabled operations', () => {
    // Disabling a resolver must not disable the domain. A host that owns the
    // workflow itself (its own inbound flow, its own QC step) drives these
    // services directly and would break if the switch reached into the core
    // module's providers.
    expect(app.get(MaterialService)).toBeDefined();
    expect(app.get(ReceiveInventoryOrderService)).toBeDefined();
  });

  it('keeps the schema otherwise intact', () => {
    // A blunt regression net: pruning three fields must not cascade into
    // unrelated parts of the schema.
    expect(rootFieldNames('Query').length).toBeGreaterThan(20);
    expect(rootFieldNames('Mutation').length).toBeGreaterThan(30);
  });
});
