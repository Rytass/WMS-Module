import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GraphQLModule, GraphQLSchemaHost } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { TypeOrmModule } from '@nestjs/typeorm';
import { graphql, type GraphQLSchema } from 'graphql';
import { Client } from 'pg';
import { DataSource, type DeepPartial } from 'typeorm';
import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import {
  AggregatedStockSortField,
  BatchEntityClass,
  BatchService,
  LoadersEntityClass,
  LocationEntityClass,
  MaterialEntityClass,
  MaterialService,
  MaterialSortField,
  SortOrder,
  StockEntityClass,
  StockGroupedByMaterialSortField,
  StockService,
  UnitEntityClass,
  WmsEntities,
} from '@rytass/wms-module-core';
import { WmsModuleGraphqlModule } from './graphql.module';
import { LoaderService, createWmsLoaders } from './helpers';

/**
 * Server-side list sorting, one table of cases for every sortable list.
 *
 * Adding a list = adding one entry to `LIST_SORT_CASES`: a seed that returns
 * each row's sort values, and a `fetchPage` (normally `graphqlPage(...)`).
 * For every value of the list's `<List>SortField` enum, in both directions,
 * the suite checks that
 *
 *   1. the whole list comes back in the expected order — the fixture values
 *      compared plainly, NULLs last, ties broken by `id` ascending;
 *   2. walking it `LIMIT` rows at a time yields exactly that list again: pages
 *      do not overlap, nothing is skipped, and they add up to `total`;
 *
 * and, with `sort` omitted, that the list follows its documented default.
 *
 * Fixture rules — the expected order is computed in JS and compared with what
 * PostgreSQL returns, so the data must sort identically under any collation:
 * strings are lowercase ASCII letters/digits of one length, no spaces or
 * punctuation. Give every sortable column **duplicate values** (or the
 * tiebreaker is never exercised) and, where the column can be NULL, a NULL.
 * Set timestamps explicitly; rows inserted together share `now()`.
 *
 * Requires a reachable PostgreSQL; override with WMS_TEST_DB_* env vars.
 */
const DB_HOST = process.env['WMS_TEST_DB_HOST'] ?? 'localhost';
const DB_PORT = Number(process.env['WMS_TEST_DB_PORT'] ?? 5432);
const DB_USER =
  process.env['WMS_TEST_DB_USER'] ?? process.env['USER'] ?? 'postgres';
const DB_PASS = process.env['WMS_TEST_DB_PASS'];
const DB_NAME =
  process.env['WMS_TEST_LIST_SORTING_DB_NAME'] ??
  'wms_module_list_sorting_test';

const withMaintenanceClient = async (
  work: (client: Client) => Promise<void>,
): Promise<void> => {
  const client = new Client({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASS,
    database: 'postgres',
  });

  await client.connect();

  try {
    await work(client);
  } finally {
    await client.end();
  }
};

const dropDatabase = (): Promise<void> =>
  withMaintenanceClient(async (client) => {
    await client.query(`DROP DATABASE IF EXISTS "${DB_NAME}" WITH (FORCE)`);
  });

const resetDatabase = (): Promise<void> =>
  withMaintenanceClient(async (client) => {
    await client.query(`DROP DATABASE IF EXISTS "${DB_NAME}" WITH (FORCE)`);
    await client.query(`CREATE DATABASE "${DB_NAME}"`);
  });

// ---------------------------------------------------------------------------
// The shared harness
// ---------------------------------------------------------------------------

type SortValue = string | number | boolean | Date | null;

interface ListSortContext {
  app: INestApplication;
  dataSource: DataSource;
  entities: WmsEntities;
  /** Run a GraphQL document against the module's schema; throws on errors. */
  query: (source: string) => Promise<Record<string, unknown>>;
}

interface PageRequest<F extends string> {
  sort?: { field: F; order: SortOrder };
  offset: number;
  limit: number;
}

interface Page {
  ids: string[];
  total: number;
}

interface ListSortCase<F extends string> {
  name: string;
  /** The list's sort-field enum. Every value is swept — none may be skipped. */
  sortFields: Readonly<Record<string, F>>;
  /** Seed the list; return each row's sort values keyed by row id. */
  seed: (
    ctx: ListSortContext,
  ) => Promise<ReadonlyMap<string, Readonly<Record<F, SortValue>>>>;
  fetchPage: (ctx: ListSortContext, request: PageRequest<F>) => Promise<Page>;
  /** What the list promises when `sort` is omitted. */
  defaultOrder: readonly { field: F; order: SortOrder }[];
}

/**
 * `fetchPage` for a root list query of the usual `{ items { id } total }`
 * shape. `args` is any extra literal argument text the list needs.
 */
const graphqlPage =
  <F extends string>(field: string, args = '') =>
  async (ctx: ListSortContext, request: PageRequest<F>): Promise<Page> => {
    const sort = request.sort
      ? `sort: { field: ${request.sort.field}, order: ${request.sort.order} }`
      : '';
    const data = await ctx.query(
      `{ ${field}(offset: ${request.offset}, limit: ${request.limit} ${sort} ${args}) { total items { id } } }`,
    );
    const list = data[field] as { total: number; items: { id: string }[] };

    return { ids: list.items.map(({ id }) => id), total: list.total };
  };

const toComparable = (value: SortValue): string | number | boolean | null =>
  value instanceof Date ? value.getTime() : value;

/** NULLs last in either direction, then `id` ascending — the helper's contract. */
const expectedOrder = <F extends string>(
  rows: ReadonlyMap<string, Readonly<Record<F, SortValue>>>,
  criteria: readonly { field: F; order: SortOrder }[],
): string[] =>
  [...rows.keys()].sort((a, b) => {
    for (const { field, order } of criteria) {
      const left = toComparable(rows.get(a)?.[field] ?? null);
      const right = toComparable(rows.get(b)?.[field] ?? null);

      if (left === right) continue;
      if (left === null) return 1;
      if (right === null) return -1;

      const ascending = left < right ? -1 : 1;

      return order === SortOrder.ASC ? ascending : -ascending;
    }

    return a < b ? -1 : a > b ? 1 : 0;
  });

const PAGE_LIMIT = 3;

const walkPages = async <F extends string>(
  fetch: (request: PageRequest<F>) => Promise<Page>,
  sort: PageRequest<F>['sort'],
): Promise<{ pages: string[][]; total: number }> => {
  const first = await fetch({ sort, offset: 0, limit: PAGE_LIMIT });
  const rest = await Array.from(
    { length: Math.max(0, Math.ceil(first.total / PAGE_LIMIT) - 1) },
    (_, index) => (index + 1) * PAGE_LIMIT,
  ).reduce<Promise<string[][]>>(
    async (acc, offset) => [
      ...(await acc),
      (await fetch({ sort, offset, limit: PAGE_LIMIT })).ids,
    ],
    Promise.resolve([]),
  );

  return { pages: [first.ids, ...rest], total: first.total };
};

const describeListSort = <F extends string>(
  listCase: ListSortCase<F>,
  getContext: () => ListSortContext,
): void => {
  describe(listCase.name, () => {
    let rows: ReadonlyMap<string, Readonly<Record<F, SortValue>>>;
    const fetch = (request: PageRequest<F>): Promise<Page> =>
      listCase.fetchPage(getContext(), request);

    beforeAll(async () => {
      rows = await listCase.seed(getContext());
      // Pagination is only exercised if the fixture spans several pages.
      expect(rows.size).toBeGreaterThan(PAGE_LIMIT * 2);
    });

    const sweep = Object.values(listCase.sortFields).flatMap((field) =>
      [SortOrder.ASC, SortOrder.DESC].map((order) => ({ field, order })),
    );

    it.each(sweep)('$field $order', async (sort) => {
      const expected = expectedOrder(rows, [sort]);
      const whole = await fetch({ sort, offset: 0, limit: rows.size + 10 });

      expect(whole.total).toBe(rows.size);
      expect(whole.ids).toEqual(expected);

      const { pages, total } = await walkPages(fetch, sort);

      expect(total).toBe(rows.size);
      expect(pages.flat()).toEqual(expected);
      expect(new Set(pages.flat()).size).toBe(total);
      pages
        .slice(0, -1)
        .forEach((page) => expect(page).toHaveLength(PAGE_LIMIT));
    });

    it('follows the default order when sort is omitted', async () => {
      const expected = expectedOrder(rows, listCase.defaultOrder);
      const { pages, total } = await walkPages(fetch, undefined);

      expect(total).toBe(rows.size);
      expect(pages.flat()).toEqual(expected);
    });
  });
};

// ---------------------------------------------------------------------------
// The lists
// ---------------------------------------------------------------------------

const materialsCase: ListSortCase<MaterialSortField> = {
  name: 'materials',
  sortFields: MaterialSortField,
  defaultOrder: [
    { field: MaterialSortField.CREATED_AT, order: SortOrder.DESC },
  ],
  fetchPage: graphqlPage<MaterialSortField>('materials'),
  seed: async ({ dataSource, entities }) => {
    const unitRepository = dataSource.getRepository(UnitEntityClass);
    const [unitA, unitB] = await unitRepository.save([
      unitRepository.create({ key: 'unita' }),
      unitRepository.create({ key: 'unitb' }),
    ]);
    // A material whose unit no longer exists: the BASE_UNIT join yields NULL.
    const orphanUnitId = '00000000-0000-4000-8000-000000000000';
    const fixtures: readonly {
      key: string;
      description: string;
      baseUnit: string;
      isActive: boolean;
      createdAt: Date;
    }[] = [
      ['mata01', 'descb', unitB.id, true, '2026-01-03'],
      ['mata02', 'desca', unitA.id, false, '2026-01-01'],
      ['mata03', 'descb', unitA.id, true, '2026-01-02'],
      ['mata04', 'descc', orphanUnitId, true, '2026-01-02'],
      ['mata05', 'desca', unitB.id, false, '2026-01-05'],
      ['mata06', 'descb', unitA.id, true, '2026-01-04'],
      ['mata07', 'descc', unitB.id, false, '2026-01-04'],
      ['mata08', 'desca', orphanUnitId, true, '2026-01-01'],
    ].map(([key, description, baseUnit, isActive, day]) => ({
      key: key as string,
      description: description as string,
      baseUnit: baseUnit as string,
      isActive: isActive as boolean,
      createdAt: new Date(`${day as string}T00:00:00.000Z`),
    }));

    const repository = dataSource.getRepository<MaterialEntityClass>(
      entities.material,
    );
    const saved = await fixtures.reduce<Promise<MaterialEntityClass[]>>(
      async (acc, { createdAt, ...fixture }) => {
        const material = await repository.save(
          repository.create(fixture as DeepPartial<MaterialEntityClass>),
        );

        // `@CreateDateColumn` ignores a value given on insert.
        await repository.update(material.id, { createdAt } as never);

        return [...(await acc), material];
      },
      Promise.resolve([]),
    );
    const unitKeys = new Map([
      [unitA.id, unitA.key],
      [unitB.id, unitB.key],
    ]);

    return new Map(
      saved.map((material, index) => {
        const fixture = fixtures[index];

        return [
          material.id,
          {
            [MaterialSortField.KEY]: fixture.key,
            [MaterialSortField.DESCRIPTION]: fixture.description,
            [MaterialSortField.BASE_UNIT]:
              unitKeys.get(fixture.baseUnit) ?? null,
            [MaterialSortField.IS_ACTIVE]: fixture.isActive,
            [MaterialSortField.CREATED_AT]: fixture.createdAt,
          },
        ];
      }),
    );
  },
};

// ---------------------------------------------------------------------------
// Stock lists. Rows here are positions or materials built from stock rows;
// each list is scoped to its own material-key prefix so the other cases'
// materials stay out of its `total`.
// ---------------------------------------------------------------------------

interface StockRow {
  materialId: string;
  batchId: string;
  locationId: string;
  loaderId: string;
  quantity: number;
}

const saveStockRows = async (
  { dataSource, entities }: ListSortContext,
  rows: readonly StockRow[],
): Promise<void> => {
  const orderRepository = dataSource.getRepository<OrderEntity>(entities.order);
  const stockRepository = dataSource.getRepository<StockEntityClass>(
    entities.stock,
  );

  await rows.reduce<Promise<void>>(async (previous, row) => {
    await previous;

    const order = await orderRepository.save(orderRepository.create({}));

    await stockRepository.save({ ...row, orderId: order.id } as never);
  }, Promise.resolve());
};

const saveMaterials = async (
  { dataSource, entities }: ListSortContext,
  fixtures: readonly { key: string; description: string; baseUnit: string }[],
): Promise<MaterialEntityClass[]> => {
  const repository = dataSource.getRepository<MaterialEntityClass>(
    entities.material,
  );

  return repository.save(
    fixtures.map((fixture) =>
      repository.create(fixture as DeepPartial<MaterialEntityClass>),
    ),
  );
};

const saveLocations = async (
  { dataSource, entities }: ListSortContext,
  keys: readonly string[],
): Promise<LocationEntityClass[]> => {
  const repository = dataSource.getRepository<LocationEntityClass>(
    entities.location,
  );

  return repository.save(
    keys.map((key) =>
      repository.create({
        key,
        description: key,
        isActive: true,
      } as DeepPartial<LocationEntityClass>),
    ),
  );
};

// A material whose unit no longer exists: the BASE_UNIT join yields NULL.
const ORPHAN_UNIT_ID = '00000000-0000-4000-8000-000000000001';

/**
 * A row is a (material, batch, location, loader, status) position; its `id` is
 * those five joined with `|`. The first four are fixed-width ids, so comparing
 * the joined string compares the tuple — the harness's "ties by id" is
 * exactly the list's group-key tiebreaker, with no extension needed.
 */
const aggregatedStocksCase: ListSortCase<AggregatedStockSortField> = {
  name: 'aggregatedStocks',
  sortFields: AggregatedStockSortField,
  // Omitted sort: the group key alone, i.e. the id.
  defaultOrder: [],
  fetchPage: graphqlPage<AggregatedStockSortField>(
    'aggregatedStocks',
    'materialKey: "aggsm"',
  ),
  seed: async (ctx) => {
    const { app, dataSource, entities } = ctx;
    const stockService = app.get(StockService);
    const batchService = app.get(BatchService);
    const unitRepository = dataSource.getRepository(UnitEntityClass);
    const units = await unitRepository.save([
      unitRepository.create({ key: 'unitc' }),
      unitRepository.create({ key: 'unitd' }),
    ]);
    const unitKeys = new Map(units.map(({ id, key }) => [id, key]));
    const materials = await saveMaterials(ctx, [
      { key: 'aggsm01', description: 'descb', baseUnit: units[0].id },
      { key: 'aggsm02', description: 'desca', baseUnit: units[1].id },
      { key: 'aggsm03', description: 'descb', baseUnit: ORPHAN_UNIT_ID },
    ]);
    const locations = await saveLocations(ctx, ['aggla', 'agglb']);
    const loaderRepository = dataSource.getRepository(LoadersEntityClass);
    const defaultLoader = await loaderRepository.findOneByOrFail({
      id: stockService.resolveLoaderId(null),
    });
    const loaders = await loaderRepository.save(
      ['ldra02', 'ldra01'].map((serialId) =>
        loaderRepository.create({
          serialId,
          typeId: defaultLoader.typeId,
          locationId: defaultLoader.locationId,
        }),
      ),
    );

    const batchRepository = dataSource.getRepository<BatchEntityClass>(
      entities.batch,
    );
    // material, batch key, held, vendor, customer, sale, sale serial
    const batchFixtures: readonly [
      number,
      string,
      boolean,
      string | null,
      string | null,
      string | null,
      string | null,
    ][] = [
      [0, 'bata01', false, 'vena', null, 'salea', 'sera'],
      [0, 'bata02', true, null, 'cusa', 'saleb', 'serb'],
      [1, 'bata01', false, 'vena', 'cusa', null, null],
      [1, 'bata02', false, 'venb', null, 'salea', 'sera'],
      [2, 'bata01', false, null, 'cusb', 'saleb', 'serb'],
      [2, 'bata02', true, 'venb', 'cusa', 'salea', 'sera'],
    ];
    const batches = await batchFixtures.reduce<
      Promise<{ id: string; fixture: (typeof batchFixtures)[number] }[]>
    >(async (acc, fixture) => {
      const [material, key, held, vendorId, customerId, saleId, saleSerialId] =
        fixture;
      const batch = await batchService.getBatch({
        key,
        materialId: materials[material].id,
      });

      await batchRepository.update(batch.id, {
        held,
        vendorId,
        customerId,
        saleId,
        saleSerialId,
      } as never);

      return [...(await acc), { id: batch.id, fixture }];
    }, Promise.resolve([]));

    // batch, location, loader, the quantities of its stock rows
    const positions: readonly [number, number, number, number[]][] = [
      [0, 0, 0, [3, 2]],
      [0, 1, 1, [7]],
      [1, 0, 0, [5]],
      [2, 0, 1, [3]],
      [3, 1, 0, [10, -3]],
      [4, 1, 0, [3]],
      [5, 0, 1, [9]],
      [2, 1, 0, [5]],
    ];

    await saveStockRows(
      ctx,
      positions.flatMap(([batch, location, loader, quantities]) =>
        quantities.map((quantity) => ({
          materialId: materials[batches[batch].fixture[0]].id,
          batchId: batches[batch].id,
          locationId: locations[location].id,
          loaderId: loaders[loader].id,
          quantity,
        })),
      ),
    );

    return new Map(
      positions.map(([batch, location, loader, quantities]) => {
        const { id: batchId, fixture } = batches[batch];
        const [materialIndex, batchKey, held, vendor, customer, sale, serial] =
          fixture;
        const material = materials[materialIndex];
        const status = held ? 'HELD' : 'FREE';

        return [
          [
            material.id,
            batchId,
            locations[location].id,
            loaders[loader].id,
            status,
          ].join('|'),
          {
            [AggregatedStockSortField.STATUS]: status,
            [AggregatedStockSortField.MATERIAL_KEY]: material.key,
            [AggregatedStockSortField.MATERIAL_DESCRIPTION]:
              material.description,
            [AggregatedStockSortField.BATCH_KEY]: batchKey,
            [AggregatedStockSortField.LOCATION_KEY]: locations[location].key,
            [AggregatedStockSortField.LOADER_SERIAL_ID]:
              loaders[loader].serialId,
            [AggregatedStockSortField.QUANTITY]: quantities.reduce(
              (sum, quantity) => sum + quantity,
              0,
            ),
            [AggregatedStockSortField.BASE_UNIT]:
              unitKeys.get(material.baseUnit) ?? null,
            [AggregatedStockSortField.VENDOR_ID]: vendor,
            [AggregatedStockSortField.CUSTOMER_ID]: customer,
            [AggregatedStockSortField.SALE_ID]: sale,
            [AggregatedStockSortField.SALE_SERIAL_ID]: serial,
          },
        ];
      }),
    );
  },
};

/**
 * One row per material; QUANTITY is the material's total over its positions,
 * including a negative one and one that nets to zero across two locations
 * (still listed: each position is non-zero).
 */
const stocksGroupedByMaterialCase: ListSortCase<StockGroupedByMaterialSortField> =
  {
    name: 'stocksGroupedByMaterial',
    sortFields: StockGroupedByMaterialSortField,
    defaultOrder: [
      {
        field: StockGroupedByMaterialSortField.MATERIAL_KEY,
        order: SortOrder.ASC,
      },
    ],
    fetchPage: graphqlPage<StockGroupedByMaterialSortField>(
      'stocksGroupedByMaterial',
      'materialKey: "grpsm"',
    ),
    seed: async (ctx) => {
      const { app, dataSource } = ctx;
      const stockService = app.get(StockService);
      const batchService = app.get(BatchService);
      const unitRepository = dataSource.getRepository(UnitEntityClass);
      const units = await unitRepository.save([
        unitRepository.create({ key: 'unite' }),
        unitRepository.create({ key: 'unitf' }),
      ]);
      const unitKeys = new Map(units.map(({ id, key }) => [id, key]));
      const locations = await saveLocations(ctx, ['grpla', 'grplb']);
      // key, description, unit, quantities at location a / b
      const fixtures: readonly [string, string, string, number[]][] = [
        ['grpsm05', 'desca', units[1].id, [1]],
        ['grpsm02', 'desca', units[1].id, [3, 2]],
        ['grpsm07', 'descc', units[0].id, [3]],
        ['grpsm01', 'descb', units[0].id, [5]],
        ['grpsm04', 'descc', ORPHAN_UNIT_ID, [9]],
        ['grpsm03', 'descb', units[0].id, [-4]],
        ['grpsm06', 'descb', ORPHAN_UNIT_ID, [5, -5]],
      ];
      const materials = await saveMaterials(
        ctx,
        fixtures.map(([key, description, baseUnit]) => ({
          key,
          description,
          baseUnit,
        })),
      );
      const rows = await materials.reduce<Promise<StockRow[]>>(
        async (acc, material, index) => {
          const batch = await batchService.getBatch({
            key: 'batg01',
            materialId: material.id,
          });

          return [
            ...(await acc),
            ...fixtures[index][3].map((quantity, location) => ({
              materialId: material.id,
              batchId: batch.id,
              locationId: locations[location].id,
              loaderId: stockService.resolveLoaderId(null),
              quantity,
            })),
          ];
        },
        Promise.resolve([]),
      );

      await saveStockRows(ctx, rows);

      return new Map(
        materials.map((material, index) => [
          material.id,
          {
            [StockGroupedByMaterialSortField.MATERIAL_KEY]: material.key,
            [StockGroupedByMaterialSortField.MATERIAL_DESCRIPTION]:
              material.description,
            [StockGroupedByMaterialSortField.QUANTITY]: fixtures[
              index
            ][3].reduce((sum, quantity) => sum + quantity, 0),
            [StockGroupedByMaterialSortField.BASE_UNIT]:
              unitKeys.get(material.baseUnit) ?? null,
          },
        ]),
      );
    },
  };

describe('list sorting (integration)', () => {
  let app: INestApplication;
  let context: ListSortContext;

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

    const schema: GraphQLSchema = app.get(GraphQLSchemaHost).schema;
    const loaderService = app.get(LoaderService);

    context = {
      app,
      dataSource: app.get(DataSource),
      entities: app.get(WmsEntities),
      query: async (source) => {
        const { data, errors } = await graphql({
          schema,
          source,
          contextValue: { ...createWmsLoaders(loaderService) },
        });

        if (errors?.length) throw errors[0];

        return data as Record<string, unknown>;
      },
    };
  });

  afterAll(async () => {
    await app?.close();
    await dropDatabase();
  });

  describeListSort(materialsCase, () => context);

  describe('MaterialService.findMany called directly', () => {
    it('defaults to newest first, then id, with no sort argument', async () => {
      const service = app.get(MaterialService);
      const [all, total] = await service.findMany({});
      const [firstPage] = await service.findMany({ offset: 0, limit: 2 });
      const [secondPage] = await service.findMany({ offset: 2, limit: 2 });
      const expected = [...all]
        .sort((a, b) =>
          b.createdAt.getTime() !== a.createdAt.getTime()
            ? b.createdAt.getTime() - a.createdAt.getTime()
            : a.id < b.id
              ? -1
              : 1,
        )
        .map(({ id }) => id);

      expect(total).toBe(all.length);
      expect(all.map(({ id }) => id)).toEqual(expected);
      expect([...firstPage, ...secondPage].map(({ id }) => id)).toEqual(
        expected.slice(0, 4),
      );
    });

    it('rejects a sort field outside the whitelist', async () => {
      await expect(
        app.get(MaterialService).findMany({
          sort: {
            field: 'baseUnit' as MaterialSortField,
            order: SortOrder.ASC,
          },
        }),
      ).rejects.toThrow('Unknown sort field');
    });
  });

  describeListSort(aggregatedStocksCase, () => context);

  describe('StockService.findAggregatedStocks called directly', () => {
    const groupKey = (row: {
      materialId: string;
      batchId: string;
      locationId: string;
      loaderId: string;
      status: string;
    }): string =>
      [
        row.materialId,
        row.batchId,
        row.locationId,
        row.loaderId,
        row.status,
      ].join('|');

    it('keeps the group-key order, page by page, with no sort argument', async () => {
      const service = app.get(StockService);
      const [all, total] = await service.findAggregatedStocks({
        materialKey: 'aggsm',
      });
      const [firstPage] = await service.findAggregatedStocks({
        materialKey: 'aggsm',
        offset: 0,
        limit: 3,
      });
      const [secondPage] = await service.findAggregatedStocks({
        materialKey: 'aggsm',
        offset: 3,
        limit: 3,
      });
      const keys = all.map(groupKey);

      expect(total).toBe(8);
      expect(keys).toEqual([...keys].sort());
      expect([...firstPage, ...secondPage].map(groupKey)).toEqual(
        keys.slice(0, 6),
      );
    });

    it('rejects a sort field outside the whitelist', async () => {
      await expect(
        app.get(StockService).findAggregatedStocks({
          sort: {
            field: 'quantity' as AggregatedStockSortField,
            order: SortOrder.ASC,
          },
        }),
      ).rejects.toThrow('Unknown sort field');
    });
  });

  describeListSort(stocksGroupedByMaterialCase, () => context);

  describe('StockService.findManyGroupedByMaterialId called directly', () => {
    it('defaults to material key, then id, with no sort argument', async () => {
      const service = app.get(StockService);
      const [all, total] = await service.findManyGroupedByMaterialId({
        materialKey: 'grpsm',
      });
      const [secondPage] = await service.findManyGroupedByMaterialId({
        materialKey: 'grpsm',
        offset: 2,
        limit: 2,
      });

      expect(total).toBe(7);
      expect(all.map(({ key }) => key)).toEqual([
        'grpsm01',
        'grpsm02',
        'grpsm03',
        'grpsm04',
        'grpsm05',
        'grpsm06',
        'grpsm07',
      ]);
      expect(secondPage.map(({ key }) => key)).toEqual(['grpsm03', 'grpsm04']);
    });

    it('rejects a sort field outside the whitelist', async () => {
      await expect(
        app.get(StockService).findManyGroupedByMaterialId({
          sort: {
            field: 'quantity' as StockGroupedByMaterialSortField,
            order: SortOrder.ASC,
          },
        }),
      ).rejects.toThrow('Unknown sort field');
    });
  });
});
