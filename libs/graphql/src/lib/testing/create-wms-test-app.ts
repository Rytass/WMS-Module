import type { INestApplication, ModuleMetadata } from '@nestjs/common';
import { ApolloDriver } from '@nestjs/apollo';
import { GraphQLModule, GraphQLSchemaHost } from '@nestjs/graphql';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { graphql, type ExecutionResult, type GraphQLSchema } from 'graphql';
import { DataSource } from 'typeorm';
import { WmsEntities } from '@rytass/wms-module-core';
import { WmsModuleGraphqlModule } from '../graphql.module';
import { LoaderService, createWmsLoaders } from '../helpers';
import { createTestDatabase, type TestDatabase } from './create-test-database';

type GraphqlModuleOptions = Parameters<
  typeof WmsModuleGraphqlModule.forRootAsync
>[0];

export interface WmsTestAppOptions {
  /** Short name for the spec; becomes part of the database name. */
  readonly label: string;
  /** Overrides on top of the defaults every spec uses. */
  readonly wms?: Partial<GraphqlModuleOptions>;
  /** Mount Apollo and expose `execute`. On by default. */
  readonly graphql?: boolean;
  readonly extraImports?: ModuleMetadata['imports'];
}

export interface WmsTestApp {
  readonly app: INestApplication;
  readonly dataSource: DataSource;
  readonly entities: WmsEntities;
  readonly database: TestDatabase;
  readonly get: INestApplication['get'];
  /** Runs a document against the schema; throws if `graphql: false`. */
  readonly execute: (
    source: string,
  ) => Promise<ExecutionResult<Record<string, unknown>>>;
  /** Closes the app, then drops the database. Safe to call twice. */
  close(): Promise<void>;
}

/**
 * Boots WMS on its own database and hands back everything a spec reaches for.
 * Call it from `beforeAll` and `close()` from `afterAll`.
 *
 * New specs use this; existing ones migrate when they are next edited, not in
 * one sweep.
 */
export const createWmsTestApp = async (
  options: WmsTestAppOptions,
): Promise<WmsTestApp> => {
  const database = await createTestDatabase(options.label);
  const withGraphql = options.graphql ?? true;

  try {
    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(database.options),
        WmsModuleGraphqlModule.forRootAsync({
          useFactory: async () => ({}),
          defaultLoaderSerialId: 'DEFAULT',
          defaultLoaderTypeKey: 'DEFAULT',
          defaultLocationKey: 'DEFAULT',
          ...options.wms,
        } as GraphqlModuleOptions),
        ...(withGraphql
          ? [
              GraphQLModule.forRootAsync({
                driver: ApolloDriver,
                inject: [LoaderService],
                useFactory: (loaders: LoaderService) => ({
                  autoSchemaFile: true,
                  context: () => ({ ...createWmsLoaders(loaders) }),
                }),
              }),
            ]
          : []),
        ...(options.extraImports ?? []),
      ],
    }).compile();

    const app = moduleRef.createNestApplication();

    await app.init();

    const schema: GraphQLSchema | undefined = withGraphql
      ? app.get(GraphQLSchemaHost).schema
      : undefined;
    const loaderService = withGraphql ? app.get(LoaderService) : undefined;
    let closed = false;

    return {
      app,
      database,
      dataSource: app.get(DataSource),
      entities: app.get(WmsEntities),
      get: app.get.bind(app),
      execute: async (source) => {
        if (!schema || !loaderService) {
          throw new Error('createWmsTestApp was called with graphql: false');
        }

        return graphql({
          schema,
          source,
          contextValue: { ...createWmsLoaders(loaderService) },
        }) as Promise<ExecutionResult<Record<string, unknown>>>;
      },
      close: async (): Promise<void> => {
        if (closed) return;

        closed = true;
        await app.close();
        await database.drop();
      },
    };
  } catch (error) {
    // A boot failure must not leave the database behind.
    await database.drop();
    throw error;
  }
};
