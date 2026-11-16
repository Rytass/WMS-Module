import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from 'pg';
import { DataSource, type DeepPartial } from 'typeorm';
import {
  LocationEntityClass,
  MaterialEntityClass,
  ReceiveInventoryOrderService,
  ShipInventoryOrderEntityClass,
  ShipInventoryOrderService,
  StockService,
  WmsEntities,
} from '@rytass/wms-module-core';
import { WmsModuleGraphqlModule } from './graphql.module';
import { LoaderService, createWmsLoaders } from './helpers';

/**
 * The three lists that read through `getRawMany()` — receive orders, ship
 * orders and the change history — paginate with `offset`/`limit`.
 *
 * They used to call `skip`/`take`, which TypeORM only honours on a raw query
 * when the builder has no joins; all three join (a computed `status`, a
 * `stock_status` subquery, eleven change tables), so the pagination was
 * dropped without an error and every page returned the whole table while
 * `total` stayed correct. That is invisible from a resolver test with one page
 * of fixtures, which is why this spec seeds more than a page and calls the
 * services directly, the way the resolvers and a host do.
 *
 * Each case checks the three things a page has to get right: it is exactly
 * `limit` rows, consecutive pages do not overlap, and the pages add up to
 * `total` — the last two are what a missing `ORDER BY` or a one-to-many join
 * would break.
 *
 * Requires a reachable PostgreSQL; override with WMS_TEST_DB_* env vars.
 */
const DB_HOST = process.env['WMS_TEST_DB_HOST'] ?? 'localhost';
const DB_PORT = Number(process.env['WMS_TEST_DB_PORT'] ?? 5432);
const DB_USER =
  process.env['WMS_TEST_DB_USER'] ?? process.env['USER'] ?? 'postgres';
const DB_PASS = process.env['WMS_TEST_DB_PASS'];
const DB_NAME =
  process.env['WMS_TEST_LIST_PAGINATION_DB_NAME'] ??
  'wms_module_list_pagination_test';

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

/**
 * Walk a paginated finder page by page and return every id it handed out.
 *
 * The walk is bounded by `total`, not by "a short page": a finder that ignores
 * `limit` never produces a short page, and the guard has to fail on an
 * assertion rather than hang until the test timeout.
 */
const collectPages = async (
  fetchPage: (offset: number) => Promise<[{ id: string }[], number]>,
  limit: number,
): Promise<{ ids: string[]; total: number; pageSizes: number[] }> => {
  const ids: string[] = [];
  const pageSizes: number[] = [];
  const [firstPage, total] = await fetchPage(0);

  pageSizes.push(firstPage.length);
  ids.push(...firstPage.map(({ id }) => id));

  for (let offset = limit; offset < total; offset += limit) {
    const [page] = await fetchPage(offset);

    pageSizes.push(page.length);
    ids.push(...page.map(({ id }) => id));
  }

  return { ids, total, pageSizes };
};

describe('raw list pagination (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let entities: WmsEntities;
  let receiveService: ReceiveInventoryOrderService;
  let shipService: ShipInventoryOrderService;
  let stockService: StockService;

  const ORDERS = 5;
  const LIMIT = 2;

  let materialId: string;

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

    dataSource = app.get(DataSource);
    entities = app.get(WmsEntities);
    receiveService = app.get(ReceiveInventoryOrderService);
    shipService = app.get(ShipInventoryOrderService);
    stockService = app.get(StockService);

    const locationRepository = dataSource.getRepository<LocationEntityClass>(
      entities.location,
    );

    await locationRepository.save(
      locationRepository.create({
        key: 'PAGE-SHELF',
        description: 'shelf',
        isActive: true,
      } as DeepPartial<LocationEntityClass>),
    );

    const materialRepository = dataSource.getRepository<MaterialEntityClass>(
      entities.material,
    );
    const material = await materialRepository.save(
      materialRepository.create({
        key: 'PAGE-MATERIAL',
      } as DeepPartial<MaterialEntityClass>),
    );

    materialId = material.id;

    // One receipt per wanted line, executed: that gives the receive list its
    // orders and the change history its rows in one go. The history lists a
    // stock row only when its change has the same sign (a receipt: both
    // positive), which is why a scrape — positive change, negative stock —
    // would not do here.
    for (let index = 0; index < ORDERS; index += 1) {
      const order = await receiveService.createReceiveInventoryOrder({
        key: `PAGE-RCV-${index}`,
        description: 'pagination fixture',
        items: [
          {
            serialId: `PAGE-RCV-${index}-1`,
            materialKey: 'PAGE-MATERIAL',
            batchKey: 'PAGE-BATCH',
            locationKey: 'PAGE-SHELF',
            targetReceivedQuantity: 1,
            requireInspection: false,
          },
        ],
      });

      const [item] = await dataSource
        .getRepository(receiveService.receiveInventoryOrderItemEntity)
        .find({ where: { orderId: order.id } });

      await receiveService.receive({
        itemId: item.id,
        quantity: 1,
        batchKey: 'PAGE-BATCH',
        locationKey: 'PAGE-SHELF',
      });
    }

    // Headers are enough for the ship list: its status join reads the item
    // and change tables, and an order with neither is PENDING.
    const shipRepository = dataSource.getRepository(
      ShipInventoryOrderEntityClass,
    );

    for (let index = 0; index < ORDERS; index += 1) {
      await shipRepository.save(
        shipRepository.create({
          key: `PAGE-SHP-${index}`,
          description: 'pagination fixture',
        } as DeepPartial<ShipInventoryOrderEntityClass>),
      );
    }
  });

  afterAll(async () => {
    await app?.close();
  });

  const expectCleanPages = ({
    ids,
    total,
    pageSizes,
  }: Awaited<ReturnType<typeof collectPages>>): void => {
    expect(total).toBe(ORDERS);
    // Every page but the last is full; the last holds the remainder.
    expect(pageSizes).toEqual([LIMIT, LIMIT, ORDERS - 2 * LIMIT]);
    // No row twice, no row missing.
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(total);
  };

  it('pages receive orders', async () => {
    expectCleanPages(
      await collectPages(
        (offset) => receiveService.findMany({ limit: LIMIT, offset }),
        LIMIT,
      ),
    );

    // The shape the resolver relies on: a page is `limit` rows, not the table.
    const [onePage, total] = await receiveService.findMany({ limit: 1 });

    expect(onePage).toHaveLength(1);
    expect(total).toBe(ORDERS);
  });

  it('pages ship orders', async () => {
    expectCleanPages(
      await collectPages(
        (offset) => shipService.findMany({ limit: LIMIT, offset }),
        LIMIT,
      ),
    );

    const [onePage, total] = await shipService.findMany({ limit: 1 });

    expect(onePage).toHaveLength(1);
    expect(total).toBe(ORDERS);
  });

  it('pages the change history', async () => {
    expectCleanPages(
      await collectPages(
        (offset) =>
          stockService.findChangeLogs({ materialId, limit: LIMIT, offset }),
        LIMIT,
      ),
    );

    const [onePage, total] = await stockService.findChangeLogs({
      materialId,
      limit: 1,
    });

    expect(onePage).toHaveLength(1);
    expect(total).toBe(ORDERS);
  });

  it('still returns everything when no page is asked for', async () => {
    // `limit` is optional on all three; leaving it out is "the whole list",
    // which a host script relies on.
    const [all, total] = await receiveService.findMany({});

    expect(all).toHaveLength(total);
    expect(total).toBe(ORDERS);
  });

  /*
   * The aggregated stock list went raw for its computed columns and paged with
   * skip/take, which TypeORM drops without a word once the builder gains a
   * join; it also had no ORDER BY, so LIMIT/OFFSET pages could repeat or skip
   * rows. An aggregated row has no id: the group key is its identity.
   */
  it('pages the aggregated stock list', async () => {
    const material = await dataSource
      .getRepository<MaterialEntityClass>(entities.material)
      .save({ key: 'PAGE-AGG-MATERIAL' } as DeepPartial<MaterialEntityClass>);

    for (let index = 0; index < ORDERS; index += 1) {
      const order = await receiveService.createReceiveInventoryOrder({
        key: `PAGE-AGG-RCV-${index}`,
        description: 'aggregated pagination fixture',
        items: [
          {
            serialId: `PAGE-AGG-RCV-${index}-1`,
            materialKey: 'PAGE-AGG-MATERIAL',
            batchKey: `PAGE-AGG-BATCH-${index}`,
            locationKey: 'PAGE-SHELF',
            targetReceivedQuantity: 1,
            requireInspection: false,
          },
        ],
      });
      const [item] = await dataSource
        .getRepository(receiveService.receiveInventoryOrderItemEntity)
        .find({ where: { orderId: order.id } });

      await receiveService.receive({
        itemId: item.id,
        quantity: 1,
        batchKey: `PAGE-AGG-BATCH-${index}`,
        locationKey: 'PAGE-SHELF',
      });
    }

    const groupKey = (row: {
      batchId: string;
      locationId: string | null;
      loaderId: string | null;
      status: string | null;
    }): string =>
      [row.batchId, row.locationId, row.loaderId, row.status].join('|');

    expectCleanPages(
      await collectPages(async (offset) => {
        const [rows, total] = await stockService.findAggregatedStocks({
          materialId: material.id,
          limit: LIMIT,
          offset,
        });

        return [rows.map((row) => ({ id: groupKey(row) })), total];
      }, LIMIT),
    );
  });
});
