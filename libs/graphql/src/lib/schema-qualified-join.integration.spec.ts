import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from 'pg';
import { DataSource, type DataSourceOptions, type DeepPartial } from 'typeorm';
import {
  LocationEntityClass,
  MaterialEntityClass,
  ReceiveInventoryOrderService,
  ShipInventoryOrderService,
  StockService,
  WmsEntities,
  WmsModuleCoreModule,
  WmsOperationRunner,
  withWmsTablePrefix,
} from '@rytass/wms-module-core';

type PostgresConnectionOptions = Extract<
  DataSourceOptions,
  { type: 'postgres' }
>;

/**
 * A host whose connection names a schema (Shuttle runs each environment in its
 * own one). Every table path then reads `<schema>.<table>`, and a hand-written
 * join that passes that string is parsed by TypeORM as `<alias>.<relation>` —
 * `"<schema>" alias was not found`. Joins must pass the entity instead.
 *
 * Requires a reachable PostgreSQL; override with WMS_TEST_DB_* env vars.
 */
const DB_HOST = process.env['WMS_TEST_DB_HOST'] ?? 'localhost';
const DB_PORT = Number(process.env['WMS_TEST_DB_PORT'] ?? 5432);
const DB_USER =
  process.env['WMS_TEST_DB_USER'] ?? process.env['USER'] ?? 'postgres';
const DB_PASS = process.env['WMS_TEST_DB_PASS'];
const DB_NAME =
  process.env['WMS_TEST_SCHEMA_DB_NAME'] ?? 'wms_module_schema_test';

const SCHEMA = 'host_schema';
const PREFIX = 'wms_';

const resetDatabase = async (): Promise<void> => {
  const admin = new Client({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASS,
    database: 'postgres',
  });

  await admin.connect();

  try {
    await admin.query(`DROP DATABASE IF EXISTS "${DB_NAME}" WITH (FORCE)`);
    await admin.query(`CREATE DATABASE "${DB_NAME}"`);
  } finally {
    await admin.end();
  }

  const client = new Client({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASS,
    database: DB_NAME,
  });

  await client.connect();

  try {
    await client.query(`CREATE SCHEMA "${SCHEMA}"`);
  } finally {
    await client.end();
  }
};

const connectionOptions = (): PostgresConnectionOptions => ({
  type: 'postgres',
  host: DB_HOST,
  port: DB_PORT,
  username: DB_USER,
  password: DB_PASS,
  database: DB_NAME,
  schema: SCHEMA,
  synchronize: true,
  uuidExtension: 'uuid-ossp',
});

describe('schema-qualified tables (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let entities: WmsEntities;
  let stockService: StockService;
  let materialId: string;
  let shelfId: string;

  beforeAll(async () => {
    await resetDatabase();

    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRootAsync({
          useFactory: () =>
            withWmsTablePrefix(
              { ...connectionOptions(), autoLoadEntities: true },
              PREFIX,
            ),
        }),
        WmsModuleCoreModule.forRootAsync({
          useFactory: async () => ({}),
          defaultLoaderSerialId: 'DEFAULT',
          defaultLoaderTypeKey: 'DEFAULT',
          defaultLocationKey: 'DEFAULT',
          tablePrefix: PREFIX,
        }),
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    dataSource = app.get(DataSource);
    entities = app.get(WmsEntities);
    stockService = app.get(StockService);

    const locations = dataSource.getRepository<LocationEntityClass>(
      entities.location,
    );

    shelfId = (
      await locations.save(
        locations.create({
          key: 'SCH-SHELF',
          description: 'SCH-SHELF',
          isActive: true,
        } as DeepPartial<LocationEntityClass>),
      )
    ).id;

    const materials = dataSource.getRepository<MaterialEntityClass>(
      entities.material,
    );

    materialId = (
      await materials.save(
        materials.create({
          key: 'SCH-MATERIAL',
        } as DeepPartial<MaterialEntityClass>),
      )
    ).id;

    const receiving = app.get(ReceiveInventoryOrderService);

    await app.get(WmsOperationRunner).run({}, async () => {
      const order = await receiving.createReceiveInventoryOrder({
        key: 'SCH-RCV',
        description: 'schema',
        items: [
          {
            serialId: 'SCH-RCV-1',
            materialKey: 'SCH-MATERIAL',
            batchKey: 'SCH-LOT',
            locationKey: 'SCH-SHELF',
            targetReceivedQuantity: 4,
            requireInspection: false,
          },
        ],
      });
      const [item] = await dataSource
        .getRepository(receiving.receiveInventoryOrderItemEntity)
        .find({ where: { orderId: order.id } });

      await receiving.receive({ itemId: item.id, quantity: 4 });
    });
  });

  afterAll(async () => {
    await app?.close();
  });

  it('puts the WMS tables in the host schema', () => {
    expect(dataSource.getMetadata(entities.batch).tablePath).toBe(
      `${SCHEMA}.${PREFIX}batches`,
    );
  });

  it('lists stock through the status subquery', async () => {
    const [rows, count] = await stockService.findMany({ materialId });

    expect(count).toBeGreaterThan(0);
    expect(rows.reduce((sum, row) => sum + Number(row.quantity), 0)).toBe(4);
  });

  it('aggregates stock with its batch joined', async () => {
    const [rows] = await stockService.findAggregatedStocks({
      materialId,
      locationId: shelfId,
    });

    expect(rows.reduce((sum, row) => sum + Number(row.quantity), 0)).toBe(4);
  });

  it('lists ship orders through the shipped-quantity subquery', async () => {
    await expect(
      app.get(ShipInventoryOrderService).findMany({}),
    ).resolves.toEqual([[], 0]);
  });
});
