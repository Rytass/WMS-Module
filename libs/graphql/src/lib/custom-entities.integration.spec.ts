import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GraphQLModule, GraphQLSchemaHost } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from 'pg';
import { ChildEntity, Column, DataSource } from 'typeorm';
import { ExecutionResult, GraphQLSchema, graphql } from 'graphql';
import { WarehouseMapEntity as BaseWarehouseMapEntity } from '@rytass/wms-base-nestjs-module/models/warehouse-map.entity';
import {
  BatchEntityClass,
  LocationEntityClass,
  MaterialEntityClass,
  OrderEntityClass,
  StockEntityClass,
  WmsEntities,
} from '@rytass/wms-module-core';
import { WmsModuleGraphqlModule } from './graphql.module';
import { LoaderService, createWmsLoaders } from './helpers';

/**
 * Every entity `WMSBaseModuleOptions` can replace, replaced at once.
 *
 * The material override has its own suite covering the read paths in depth;
 * this one is about the other five and about them working *together* — a single
 * app where nothing at all resolves to a built-in class. The decisive assertion
 * is the discriminator each table ends up carrying: single-table inheritance
 * stamps `entityName` from whichever class opened the repository, so a row that
 * says `TenantXEntity` can only have been written through the configured entity.
 * Any surviving hard-coded reference writes the built-in name instead.
 *
 * Requires a reachable PostgreSQL; override with WMS_TEST_DB_* env vars.
 */
const DB_HOST = process.env['WMS_TEST_DB_HOST'] ?? 'localhost';
const DB_PORT = Number(process.env['WMS_TEST_DB_PORT'] ?? 5432);
const DB_USER =
  process.env['WMS_TEST_DB_USER'] ?? process.env['USER'] ?? 'postgres';
const DB_PASS = process.env['WMS_TEST_DB_PASS'];
const DB_NAME =
  process.env['WMS_TEST_ENTITIES_DB_NAME'] ?? 'wms_module_custom_entities_test';

@ChildEntity()
class TenantMaterialEntity extends MaterialEntityClass {
  @Column({ type: 'varchar', nullable: true })
  erpCode!: string | null;
}

@ChildEntity()
class TenantBatchEntity extends BatchEntityClass {
  @Column({ type: 'varchar', nullable: true })
  lotNote!: string | null;
}

@ChildEntity()
class TenantLocationEntity extends LocationEntityClass {
  @Column({ type: 'varchar', nullable: true })
  zone!: string | null;
}

@ChildEntity()
class TenantStockEntity extends StockEntityClass {
  @Column({ type: 'varchar', nullable: true })
  costCentre!: string | null;
}

@ChildEntity()
class TenantOrderEntity extends OrderEntityClass {
  @Column({ type: 'varchar', nullable: true })
  sourceSystem!: string | null;
}

@ChildEntity()
class TenantWarehouseMapEntity extends BaseWarehouseMapEntity {
  @Column({ type: 'varchar', nullable: true })
  revision!: string | null;
}

const OVERRIDES = [
  TenantMaterialEntity,
  TenantBatchEntity,
  TenantLocationEntity,
  TenantStockEntity,
  TenantOrderEntity,
  TenantWarehouseMapEntity,
];

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

describe('every overridable entity (integration)', () => {
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

  const executeOrFail = async (
    source: string,
  ): Promise<Record<string, unknown>> => {
    const { data, errors } = await execute(source);

    if (errors?.length) throw errors[0];

    return data as Record<string, unknown>;
  };

  /** The distinct `entityName` values a table holds, ignoring rows with none. */
  const discriminators = async (table: string): Promise<string[]> => {
    const rows: { entityName: string | null }[] = await dataSource.query(
      `SELECT DISTINCT "entityName" FROM ${table}`,
    );

    return rows
      .map(({ entityName }) => entityName)
      .filter((name): name is string => !!name)
      .sort();
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
        TypeOrmModule.forFeature(OVERRIDES),
        WmsModuleGraphqlModule.forRootAsync({
          useFactory: async () => ({
            materialEntity: TenantMaterialEntity,
            batchEntity: TenantBatchEntity,
            locationEntity: TenantLocationEntity,
            stockEntity: TenantStockEntity,
            orderEntity: TenantOrderEntity,
            warehouseMapEntity: TenantWarehouseMapEntity,
          }),
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
  });

  afterAll(async () => {
    await app?.close();
  });

  it('resolves every entity to the configured class', () => {
    const entities = app.get(WmsEntities);

    expect({
      material: entities.material,
      batch: entities.batch,
      location: entities.location,
      stock: entities.stock,
      order: entities.order,
      warehouseMap: entities.warehouseMap,
    }).toEqual({
      material: TenantMaterialEntity,
      batch: TenantBatchEntity,
      location: TenantLocationEntity,
      stock: TenantStockEntity,
      order: TenantOrderEntity,
      warehouseMap: TenantWarehouseMapEntity,
    });
  });

  it('bootstraps its default location, loader and warehouse map on the overrides', async () => {
    // StockService and WarehouseMapDataService seed these during startup, before
    // any request touches the app — the earliest write path there is.
    await expect(discriminators('locations')).resolves.toEqual([
      'TenantLocationEntity',
    ]);
    await expect(discriminators('warehouse_maps')).resolves.toEqual([
      'TenantWarehouseMapEntity',
    ]);
  });

  it('runs the receive flow end to end on the overrides', async () => {
    const location = (await executeOrFail(`
      mutation {
        createLocation(key: "CE-LOC-1", description: "zone one") { id key }
      }
    `))['createLocation'] as { readonly id: string; readonly key: string };

    const material = (await executeOrFail(`
      mutation {
        createMaterial(
          key: "CE-MAT-1"
          description: "material one"
          baseUnit: "PCS"
          units: []
        ) { id key }
      }
    `))['createMaterial'] as { readonly id: string };

    const order = (await executeOrFail(`
      mutation {
        createReceiveInventoryOrder(
          key: "CE-RO-1"
          description: "receive"
          items: [{
            description: "item"
            serialId: "CE-RO-1-1"
            batchKey: "CE-BATCH-1"
            materialKey: "CE-MAT-1"
            locationKey: "${location.key}"
            targetReceivedQuantity: 8
          }]
        ) { id items { id material { id key } location { id key } } }
      }
    `))['createReceiveInventoryOrder'] as {
      readonly items: readonly {
        readonly id: string;
        readonly material: { readonly id: string };
        readonly location: { readonly key: string } | null;
      }[];
    };

    expect(order.items).toHaveLength(1);
    expect(order.items[0].material.id).toBe(material.id);
    expect(order.items[0].location?.key).toBe('CE-LOC-1');

    const received = await executeOrFail(`
      mutation {
        receive(items: [{ itemId: "${order.items[0].id}", quantity: 8 }])
      }
    `);

    expect(received['receive']).toBe(true);

    const stocks = (await executeOrFail(`
      query {
        stocks(materialKey: "CE-MAT-1", offset: 0, limit: 100) {
          total
          items { id quantity material { id key } location { id key } batch { id key } }
        }
      }
    `))['stocks'] as {
      readonly total: number;
      readonly items: readonly {
        readonly material: { readonly key: string };
        readonly batch: { readonly key: string } | null;
      }[];
    };

    expect(stocks.total).toBeGreaterThan(0);
    // Each of these is a DataLoader hop through a different overridden entity.
    stocks.items.forEach((stock) => {
      expect(stock.material.key).toBe('CE-MAT-1');
      expect(stock.batch?.key).toBe('CE-BATCH-1');
    });
  });

  it('stamps the custom discriminator on every table it wrote', async () => {
    // The decisive one. A built-in name appearing here means some code path
    // still opened its repository on the built-in class.
    await expect(discriminators('materials')).resolves.toEqual([
      'TenantMaterialEntity',
    ]);
    await expect(discriminators('batches')).resolves.toEqual([
      'TenantBatchEntity',
    ]);
    await expect(discriminators('locations')).resolves.toEqual([
      'TenantLocationEntity',
    ]);
    await expect(discriminators('stocks')).resolves.toEqual([
      'TenantStockEntity',
    ]);
    await expect(discriminators('orders')).resolves.toEqual([
      'TenantOrderEntity',
    ]);
  });

  it('writes the warehouse map through the configured entity', async () => {
    await executeOrFail(`
      mutation {
        updateWarehouseMap(
          locationKey: "CE-LOC-1"
          backgrounds: []
          ranges: []
        ) { id backgrounds { id } }
      }
    `);

    await expect(discriminators('warehouse_maps')).resolves.toEqual([
      'TenantWarehouseMapEntity',
    ]);
  });
});
