import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from 'pg';
import { DataSource, type DeepPartial } from 'typeorm';
import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import {
  BatchService,
  LoaderService,
  LocationEntityClass,
  MaterialEntityClass,
  ScrapeService,
  StockEntityClass,
  StockService,
  WmsSequenceService,
  WmsEntities,
  WmsModuleCoreModule,
} from '@rytass/wms-module-core';

/**
 * `sequenceStorage: 'table'` (B6): counters live in the `sequences` table.
 *
 * Shuttle's schema changes only through migrations, and the default storage
 * runs `CREATE SEQUENCE` at runtime the first time a counter is used — one per
 * order type per day for order keys. In table mode nothing creates a database
 * object at runtime, and the increment is transactional, so a rolled-back
 * order leaves no gap in the numbering. Before the option existed, every
 * assertion on `information_schema.sequences` below would have seen new
 * sequences, and the rolled-back reservation would have burned a number.
 *
 * Requires a reachable PostgreSQL; override with WMS_TEST_DB_* env vars.
 */
const DB_HOST = process.env['WMS_TEST_DB_HOST'] ?? 'localhost';
const DB_PORT = Number(process.env['WMS_TEST_DB_PORT'] ?? 5432);
const DB_USER =
  process.env['WMS_TEST_DB_USER'] ?? process.env['USER'] ?? 'postgres';
const DB_PASS = process.env['WMS_TEST_DB_PASS'];
const DB_NAME =
  process.env['WMS_TEST_HOST_SEQUENCE_DB_NAME'] ?? 'wms_module_host_seq_test';

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

class Rollback extends Error {
  constructor() {
    super('rollback on purpose');
  }
}

describe("sequenceStorage: 'table' (integration)", () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let entities: WmsEntities;
  let loaderService: LoaderService;
  let scrapeService: ScrapeService;
  let stockService: StockService;
  let batchService: BatchService;
  let shelfId: string;
  let materialId: string;
  let batchId: string;

  const sequenceCount = async (): Promise<number> =>
    Number(
      (
        await dataSource.query<[{ count: string }]>(
          `SELECT COUNT(*) AS count FROM information_schema.sequences`,
        )
      )[0].count,
    );

  const scrapeOne = (manager = dataSource.manager): Promise<{ key: string }> =>
    scrapeService.scrape(
      [{ materialId, batchId, locationId: shelfId, quantity: 1 }],
      manager,
    ) as Promise<{ key: string }>;

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
        WmsModuleCoreModule.forRootAsync({
          useFactory: async () => ({}),
          defaultLoaderSerialId: 'DEFAULT',
          defaultLoaderTypeKey: 'DEFAULT',
          defaultLocationKey: 'DEFAULT',
          sequenceStorage: 'table',
        }),
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    dataSource = app.get(DataSource);
    entities = app.get(WmsEntities);
    loaderService = app.get(LoaderService);
    scrapeService = app.get(ScrapeService);
    stockService = app.get(StockService);
    batchService = app.get(BatchService);

    const locationRepository = dataSource.getRepository<LocationEntityClass>(
      entities.location,
    );
    shelfId = (
      await locationRepository.save(
        locationRepository.create({
          key: 'HST-SHELF',
          description: 'shelf',
          isActive: true,
        } as DeepPartial<LocationEntityClass>),
      )
    ).id;

    const materialRepository = dataSource.getRepository<MaterialEntityClass>(
      entities.material,
    );
    materialId = (
      await materialRepository.save(
        materialRepository.create({
          key: 'HST-MAT',
        } as DeepPartial<MaterialEntityClass>),
      )
    ).id;
    batchId = (await batchService.getBatch({ key: 'HST-BATCH', materialId }))
      .id;

    const orderRepository = dataSource.getRepository<OrderEntity>(
      entities.order,
    );
    const base = await orderRepository.save(orderRepository.create({}));
    await dataSource.getRepository<StockEntityClass>(entities.stock).save({
      orderId: base.id,
      materialId,
      batchId,
      locationId: shelfId,
      loaderId: stockService.resolveLoaderId(null),
      quantity: 100,
    } as DeepPartial<StockEntityClass>);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('numbers loader serials consecutively, without a gap after a rollback, and creates no sequence', async () => {
    const before = await sequenceCount();
    const { id: typeId } = await loaderService.createLoaderType({
      key: 'HSTP',
      description: 'pallet',
    });
    const create = async (
      quantity: number,
      manager = dataSource.manager,
    ): Promise<string[]> =>
      (
        await loaderService.createLoader({
          typeId,
          locationId: shelfId,
          quantity,
          manager,
        })
      ).map(({ serialId }) => serialId);

    expect(await create(2)).toEqual(['HSTP0001', 'HSTP0002']);

    await expect(
      dataSource.transaction(async (manager) => {
        expect(await create(3, manager)).toEqual([
          'HSTP0003',
          'HSTP0004',
          'HSTP0005',
        ]);
        throw new Rollback();
      }),
    ).rejects.toBeInstanceOf(Rollback);

    // The rolled-back reservation went with its transaction.
    expect(await create(1)).toEqual(['HSTP0003']);
    expect(await sequenceCount()).toBe(before);
  });

  it('numbers order keys the same way', async () => {
    const before = await sequenceCount();
    const first = await scrapeOne();

    await expect(
      dataSource.transaction(async (manager) => {
        await scrapeOne(manager);
        throw new Rollback();
      }),
    ).rejects.toBeInstanceOf(Rollback);

    const second = await scrapeOne();
    const serial = (key: string): number => Number(key.slice(-4));

    expect(first.key.slice(0, 8)).toBe(second.key.slice(0, 8));
    expect(serial(second.key)).toBe(serial(first.key) + 1);
    expect(await sequenceCount()).toBe(before);
  });

  /*
   * A bounded reservation is refused before the counter moves. A sequence
   * never rolls back, and a host may catch the error and commit anyway, so
   * checking after the advance left the counter burnt either way.
   */
  it('refuses an out-of-range reservation without moving the counter, even when the caller commits', async () => {
    const sequences = app.get(WmsSequenceService);
    const name = `HST_BOUND_${Date.now()}`;
    const bound = { maxValue: 5 };

    expect(await sequences.reserve(name, 3, undefined, bound)).toBe(1);

    await dataSource.transaction(async (manager) => {
      await expect(sequences.reserve(name, 3, manager, bound)).rejects.toThrow(
        /SEQUENCE_OUT_OF_RANGE/,
      );
    });

    await expect(sequences.reserve(name, 6, undefined, bound)).rejects.toThrow(
      /SEQUENCE_OUT_OF_RANGE/,
    );
    expect(await sequences.reserve(name, 2, undefined, bound)).toBe(4);
  });

  it('keeps concurrent callers of one counter apart', async () => {
    const { id: typeId } = await loaderService.createLoaderType({
      key: 'HSTQ',
      description: 'pallet',
    });
    const batches = await Promise.all(
      [3, 3, 3, 3].map((quantity) =>
        loaderService.createLoader({ typeId, locationId: shelfId, quantity }),
      ),
    );
    const serials = batches.flat().map(({ serialId }) => serialId);

    expect(new Set(serials).size).toBe(12);
    expect([...serials].sort()).toEqual(
      Array.from(
        { length: 12 },
        (_, index) => `HSTQ${String(index + 1).padStart(4, '0')}`,
      ),
    );
  });
});
