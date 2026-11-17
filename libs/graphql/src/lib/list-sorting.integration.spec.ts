import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GraphQLModule, GraphQLSchemaHost } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { TypeOrmModule } from '@nestjs/typeorm';
import { graphql, type GraphQLSchema } from 'graphql';
import { Client } from 'pg';
import { DataSource, type DeepPartial, type EntityTarget } from 'typeorm';
import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import {
  ChangeLogSortField,
  ChangeType,
  ReceiveInventoryOrderService,
  ReceiveInventoryOrderSortField,
  ShipInventoryOrderService,
  ShipInventoryOrderSortField,
  StockEntityClass,
  StockService,
  StockStatus,
  WmsOperationRunner,
  AllocateInventoryOrderEntityClass,
  BatchEntityClass,
  InventoryCountOrderEntityClass,
  InventoryCountOrderItemEntityClass,
  InventoryCountOrderItemSortField,
  InventoryCountOrderService,
  InventoryCountOrderSortField,
  InventoryCountStatus,
  ConsumptionOrderEntityClass,
  ConsumptionOrderService,
  ConsumptionOrderSortField,
  TransferOrderEntityClass,
  TransferOrderService,
  TransferOrderSortField,
  AllocateInventoryOrderService,
  HoldInventoryOrderEntityClass,
  HoldInventoryOrderService,
  LoaderService as CoreLoaderService,
  LoaderSortField,
  LoaderTypeEntityClass,
  LoaderTypeSortField,
  LoadersEntityClass,
  LocationEntityClass,
  LocationService,
  LocationSortField,
  AggregatedStockSortField,
  BatchService,
  MaterialEntityClass,
  MaterialService,
  MaterialSortField,
  SortOrder,
  StockGroupedByMaterialSortField,
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
// Fixture helpers
// ---------------------------------------------------------------------------

const day = (value: string): Date => new Date(`${value}T00:00:00.000Z`);

/**
 * Save rows one at a time, then stamp each `createdAt` — `@CreateDateColumn`
 * ignores a value given on insert.
 */
const saveStamped = async <E extends { id: string }>(
  dataSource: DataSource,
  target: EntityTarget<E>,
  rows: readonly { row: DeepPartial<E>; createdAt: Date }[],
): Promise<E[]> => {
  const repository = dataSource.getRepository<E>(target);

  return rows.reduce<Promise<E[]>>(async (acc, { row, createdAt }) => {
    const done = await acc;
    const saved = await repository.save(repository.create(row));

    await repository.update(saved.id, { createdAt } as never);

    return [...done, saved];
  }, Promise.resolve([]));
};

/**
 * A service list called directly, the way a consumer would — no `sort` — must
 * come back in its documented default order, and two pages of two must be the
 * first four rows of it.
 */
const expectDirectDefaultOrder = async <
  R extends { id: string },
  F extends string,
>(
  fetch: (page?: { offset: number; limit: number }) => Promise<[R[], number]>,
  values: (row: R) => Readonly<Record<F, SortValue>>,
  order: readonly { field: F; order: SortOrder }[],
): Promise<void> => {
  const [all, total] = await fetch();
  const expected = expectedOrder(
    new Map(all.map((row) => [row.id, values(row)])),
    order,
  );

  expect(total).toBe(all.length);
  expect(all.length).toBeGreaterThan(4);
  expect(all.map(({ id }) => id)).toEqual(expected);

  const [first] = await fetch({ offset: 0, limit: 2 });
  const [second] = await fetch({ offset: 2, limit: 2 });

  expect([...first, ...second].map(({ id }) => id)).toEqual(
    expected.slice(0, 4),
  );
};

const newestFirst = <F extends string>(
  field: F,
): readonly { field: F; order: SortOrder }[] => [
  { field, order: SortOrder.DESC },
];

// The module seeds a DEFAULT location, loader type and loader on start-up, and
// several cases create rows of the same entity. Every case therefore narrows
// its list to its own fixtures with a filter on a prefix nobody else uses.

const locationsCase: ListSortCase<LocationSortField> = {
  name: 'locations',
  sortFields: LocationSortField,
  defaultOrder: newestFirst(LocationSortField.CREATED_AT),
  fetchPage: graphqlPage<LocationSortField>('locations', 'description: "locd"'),
  seed: async ({ dataSource, entities }) => {
    const fixtures = (
      [
        ['locs01', 'locda', true, '2026-01-03'],
        ['locs02', 'locdb', false, '2026-01-01'],
        ['locs03', 'locda', true, '2026-01-02'],
        ['locs04', 'locdc', true, '2026-01-02'],
        ['locs05', 'locdb', false, '2026-01-05'],
        ['locs06', 'locda', true, '2026-01-04'],
        ['locs07', 'locdc', false, '2026-01-04'],
        ['locs08', 'locdb', true, '2026-01-01'],
      ] as const
    ).map(([key, description, isActive, created]) => ({
      key,
      description,
      isActive,
      createdAt: day(created),
    }));
    const saved = await saveStamped<LocationEntityClass>(
      dataSource,
      entities.location,
      fixtures.map(({ createdAt, ...row }) => ({
        row: row as DeepPartial<LocationEntityClass>,
        createdAt,
      })),
    );

    return new Map(
      saved.map(({ id }, index) => {
        const fixture = fixtures[index];

        return [
          id,
          {
            [LocationSortField.KEY]: fixture.key,
            [LocationSortField.DESCRIPTION]: fixture.description,
            [LocationSortField.IS_ACTIVE]: fixture.isActive,
            [LocationSortField.CREATED_AT]: fixture.createdAt,
          },
        ];
      }),
    );
  },
};

const loaderTypesCase: ListSortCase<LoaderTypeSortField> = {
  name: 'loaderTypes',
  sortFields: LoaderTypeSortField,
  defaultOrder: newestFirst(LoaderTypeSortField.CREATED_AT),
  fetchPage: graphqlPage<LoaderTypeSortField>(
    'loaderTypes',
    'description: "ltd"',
  ),
  seed: async ({ dataSource }) => {
    const fixtures = (
      [
        ['ltk01', 'ltdb', true, '2026-02-03'],
        ['ltk02', 'ltda', false, '2026-02-01'],
        ['ltk03', 'ltdc', true, '2026-02-02'],
        ['ltk04', 'ltda', true, '2026-02-02'],
        ['ltk05', 'ltdb', false, '2026-02-05'],
        ['ltk06', 'ltdc', true, '2026-02-04'],
        ['ltk07', 'ltda', false, '2026-02-04'],
      ] as const
    ).map(([key, description, isActive, created]) => ({
      key,
      description,
      isActive,
      createdAt: day(created),
    }));
    const saved = await saveStamped(
      dataSource,
      LoaderTypeEntityClass,
      fixtures.map(({ createdAt, ...row }) => ({ row, createdAt })),
    );

    return new Map(
      saved.map(({ id }, index) => {
        const fixture = fixtures[index];

        return [
          id,
          {
            [LoaderTypeSortField.KEY]: fixture.key,
            [LoaderTypeSortField.DESCRIPTION]: fixture.description,
            [LoaderTypeSortField.IS_ACTIVE]: fixture.isActive,
            [LoaderTypeSortField.CREATED_AT]: fixture.createdAt,
          },
        ];
      }),
    );
  },
};

interface LoaderFixture {
  serialId: string;
  typeId: string;
  locationId: string;
  length: number | null;
  width: number | null;
  height: number | null;
  sizeUnit: string | null;
  volume: number | null;
  volumeUnit: string | null;
  note: string | null;
  isActive: boolean;
}

const loadersCase: ListSortCase<LoaderSortField> = {
  name: 'loaders',
  sortFields: LoaderSortField,
  defaultOrder: newestFirst(LoaderSortField.CREATED_AT),
  fetchPage: graphqlPage<LoaderSortField>('loaders', 'loaderTypeKey: "ltyp"'),
  seed: async ({ dataSource, entities }) => {
    const created = day('2025-01-01');
    // Type keys and location keys deliberately sort opposite to the order the
    // rows are created in, so an id-ordered result cannot pass by accident.
    const [typeA, typeB] = await saveStamped(
      dataSource,
      LoaderTypeEntityClass,
      [
        { row: { key: 'ltypa', description: 'tdescb' }, createdAt: created },
        { row: { key: 'ltypb', description: 'tdesca' }, createdAt: created },
      ],
    );
    const [locationA, locationB] = await saveStamped<LocationEntityClass>(
      dataSource,
      entities.location,
      [
        {
          row: {
            key: 'ldlocb',
            description: 'ldrloc',
          } as DeepPartial<LocationEntityClass>,
          createdAt: created,
        },
        {
          row: {
            key: 'ldloca',
            description: 'ldrloc',
          } as DeepPartial<LocationEntityClass>,
          createdAt: created,
        },
      ],
    );
    const typeDescriptions = new Map([
      [typeA.id, typeA.description],
      [typeB.id, typeB.description],
    ]);
    const locationKeys = new Map([
      [locationA.id, locationA.key],
      [locationB.id, locationB.key],
    ]);
    const rows: readonly { fixture: LoaderFixture; createdAt: Date }[] = [
      {
        fixture: {
          serialId: 'ldr01',
          typeId: typeA.id,
          locationId: locationB.id,
          length: 10,
          width: 5,
          height: null,
          sizeUnit: 'cm',
          volume: 2,
          volumeUnit: 'lt',
          note: 'notea',
          isActive: true,
        },
        createdAt: day('2026-03-03'),
      },
      {
        fixture: {
          serialId: 'ldr02',
          typeId: typeB.id,
          locationId: locationA.id,
          length: 20,
          width: null,
          height: 3,
          sizeUnit: 'mm',
          volume: null,
          volumeUnit: null,
          note: null,
          isActive: false,
        },
        createdAt: day('2026-03-01'),
      },
      {
        fixture: {
          serialId: 'ldr03',
          typeId: typeA.id,
          locationId: locationA.id,
          length: null,
          width: 5,
          height: 3,
          sizeUnit: null,
          volume: 2,
          volumeUnit: 'ml',
          note: 'noteb',
          isActive: true,
        },
        createdAt: day('2026-03-02'),
      },
      {
        fixture: {
          serialId: 'ldr04',
          typeId: typeB.id,
          locationId: locationB.id,
          length: 10,
          width: 7,
          height: 1,
          sizeUnit: 'cm',
          volume: 4,
          volumeUnit: 'lt',
          note: 'notea',
          isActive: true,
        },
        createdAt: day('2026-03-02'),
      },
      {
        fixture: {
          serialId: 'ldr05',
          typeId: typeA.id,
          locationId: locationA.id,
          length: 20,
          width: 7,
          height: null,
          sizeUnit: 'mm',
          volume: 4,
          volumeUnit: 'ml',
          note: null,
          isActive: false,
        },
        createdAt: day('2026-03-05'),
      },
      {
        fixture: {
          serialId: 'ldr06',
          typeId: typeB.id,
          locationId: locationB.id,
          length: 30,
          width: 5,
          height: 1,
          sizeUnit: null,
          volume: null,
          volumeUnit: 'lt',
          note: 'noteb',
          isActive: true,
        },
        createdAt: day('2026-03-04'),
      },
      {
        fixture: {
          serialId: 'ldr07',
          typeId: typeA.id,
          locationId: locationB.id,
          length: 10,
          width: null,
          height: 3,
          sizeUnit: 'cm',
          volume: 2,
          volumeUnit: null,
          note: 'notea',
          isActive: false,
        },
        createdAt: day('2026-03-04'),
      },
    ];
    const saved = await saveStamped<LoadersEntityClass>(
      dataSource,
      LoadersEntityClass,
      rows.map(({ fixture, createdAt }) => ({
        row: fixture as DeepPartial<LoadersEntityClass>,
        createdAt,
      })),
    );

    return new Map(
      saved.map(({ id }, index) => {
        const { fixture, createdAt } = rows[index];

        return [
          id,
          {
            [LoaderSortField.SERIAL_ID]: fixture.serialId,
            [LoaderSortField.TYPE_DESCRIPTION]:
              typeDescriptions.get(fixture.typeId) ?? null,
            [LoaderSortField.LOCATION_KEY]:
              locationKeys.get(fixture.locationId) ?? null,
            [LoaderSortField.LENGTH]: fixture.length,
            [LoaderSortField.WIDTH]: fixture.width,
            [LoaderSortField.HEIGHT]: fixture.height,
            [LoaderSortField.SIZE_UNIT]: fixture.sizeUnit,
            [LoaderSortField.VOLUME]: fixture.volume,
            [LoaderSortField.VOLUME_UNIT]: fixture.volumeUnit,
            [LoaderSortField.NOTE]: fixture.note,
            [LoaderSortField.IS_ACTIVE]: fixture.isActive,
            [LoaderSortField.CREATED_AT]: createdAt,
          },
        ];
      }),
    );
  },
};

const transferOrdersCase: ListSortCase<TransferOrderSortField> = {
  name: 'transferOrders',
  sortFields: TransferOrderSortField,
  defaultOrder: newestFirst(TransferOrderSortField.CREATED_AT),
  fetchPage: graphqlPage<TransferOrderSortField>(
    'transferOrders',
    'key: "trfo"',
  ),
  seed: async ({ dataSource }) => {
    const fixtures = (
      [
        ['trfo01', 'rcvb', 'trdb', 'usrb', '2026-05-03'],
        ['trfo02', null, 'trda', 'usra', '2026-05-01'],
        ['trfo03', 'rcva', null, 'usrb', '2026-05-02'],
        ['trfo04', 'rcvb', 'trda', null, '2026-05-02'],
        ['trfo05', 'rcva', 'trdb', 'usra', '2026-05-05'],
        ['trfo06', null, 'trdc', 'usrb', '2026-05-04'],
        ['trfo07', 'rcvb', null, null, '2026-05-04'],
      ] as const
    ).map(([key, receiver, description, createdBy, created]) => ({
      row: { key, receiver, description, createdBy },
      createdAt: day(created),
    }));
    const saved = await saveStamped<TransferOrderEntityClass>(
      dataSource,
      TransferOrderEntityClass,
      fixtures,
    );

    return new Map(
      saved.map(({ id }, index) => {
        const { row, createdAt } = fixtures[index];

        return [
          id,
          {
            [TransferOrderSortField.KEY]: row.key,
            [TransferOrderSortField.RECEIVER]: row.receiver,
            [TransferOrderSortField.DESCRIPTION]: row.description,
            [TransferOrderSortField.CREATED_BY]: row.createdBy,
            [TransferOrderSortField.CREATED_AT]: createdAt,
          },
        ];
      }),
    );
  },
};

const consumptionOrdersCase: ListSortCase<ConsumptionOrderSortField> = {
  name: 'consumptionOrders',
  sortFields: ConsumptionOrderSortField,
  defaultOrder: newestFirst(ConsumptionOrderSortField.CREATED_AT),
  fetchPage: graphqlPage<ConsumptionOrderSortField>(
    'consumptionOrders',
    'key: "cnso"',
  ),
  seed: async ({ dataSource }) => {
    const fixtures = (
      [
        ['cnso01', 'cndb', '2026-06-03'],
        ['cnso02', 'cnda', '2026-06-01'],
        ['cnso03', null, '2026-06-02'],
        ['cnso04', 'cnda', '2026-06-02'],
        ['cnso05', 'cndc', '2026-06-05'],
        ['cnso06', 'cndb', '2026-06-04'],
        ['cnso07', null, '2026-06-04'],
      ] as const
    ).map(([key, description, created]) => ({
      row: { key, description },
      createdAt: day(created),
    }));
    const saved = await saveStamped<ConsumptionOrderEntityClass>(
      dataSource,
      ConsumptionOrderEntityClass,
      fixtures,
    );

    return new Map(
      saved.map(({ id }, index) => {
        const { row, createdAt } = fixtures[index];

        return [
          id,
          {
            [ConsumptionOrderSortField.KEY]: row.key,
            [ConsumptionOrderSortField.DESCRIPTION]: row.description,
            [ConsumptionOrderSortField.CREATED_AT]: createdAt,
          },
        ];
      }),
    );
  },
};

const COUNT_STATUS_ORDER: readonly InventoryCountStatus[] =
  Object.values(InventoryCountStatus);

const inventoryCountOrdersCase: ListSortCase<InventoryCountOrderSortField> = {
  name: 'inventoryCountOrders',
  sortFields: InventoryCountOrderSortField,
  defaultOrder: [
    { field: InventoryCountOrderSortField.COUNT_DATE, order: SortOrder.DESC },
    { field: InventoryCountOrderSortField.CREATED_AT, order: SortOrder.DESC },
  ],
  fetchPage: graphqlPage<InventoryCountOrderSortField>(
    'inventoryCountOrders',
    'name: "cnt"',
  ),
  seed: async ({ dataSource }) => {
    const { PENDING, COUNTING, COMPLETED, CANCELLED } = InventoryCountStatus;
    const fixtures = (
      [
        ['icok01', 'cntb', '2026-07-02', COUNTING, 'usrb', '2026-07-03'],
        ['icok02', 'cnta', '2026-07-01', PENDING, null, '2026-07-01'],
        ['icok03', 'cntc', '2026-07-02', COMPLETED, 'usra', '2026-07-02'],
        ['icok04', 'cnta', '2026-07-03', CANCELLED, 'usrb', '2026-07-02'],
        ['icok05', 'cntb', '2026-07-01', PENDING, 'usra', '2026-07-05'],
        ['icok06', 'cntc', '2026-07-03', COUNTING, null, '2026-07-04'],
        ['icok07', 'cnta', '2026-07-02', COMPLETED, 'usrb', '2026-07-04'],
      ] as const
    ).map(([key, name, countDate, status, createdBy, created]) => ({
      row: { key, name, countDate, status, createdBy },
      createdAt: day(created),
    }));
    const saved = await saveStamped<InventoryCountOrderEntityClass>(
      dataSource,
      InventoryCountOrderEntityClass,
      fixtures,
    );

    return new Map(
      saved.map(({ id }, index) => {
        const { row, createdAt } = fixtures[index];

        return [
          id,
          {
            [InventoryCountOrderSortField.NAME]: row.name,
            // A PostgreSQL enum sorts by declaration order, not by spelling.
            [InventoryCountOrderSortField.STATUS]: COUNT_STATUS_ORDER.indexOf(
              row.status,
            ),
            [InventoryCountOrderSortField.COUNT_DATE]: row.countDate,
            [InventoryCountOrderSortField.CREATED_BY]: row.createdBy,
            [InventoryCountOrderSortField.CREATED_AT]: createdAt,
          },
        ];
      }),
    );
  },
};

/** Set by the count sheet seed: the order the sheet belongs to, and its rows. */
let countSheetOrderId = '';
let countSheetRows: ReadonlyMap<
  string,
  Readonly<Record<InventoryCountOrderItemSortField, SortValue>>
> = new Map();

interface CountSheetFixture {
  material: 0 | 1;
  batch: 0 | 1 | 2;
  location: 0 | 1 | null;
  loader: 0 | 1 | null;
  vendorId: string | null;
  customerId: string | null;
  saleId: string | null;
  saleSerialId: string | null;
  isAddition: boolean;
  held: boolean | null;
  transferId: string | null;
  requiresInspection: boolean | null;
  inspectionResult: boolean | null;
}

const TRANSFER_ID = '00000000-0000-4000-8000-0000000000aa';

/** Compact fixture rows: [material, batch, location, loader, vendor, customer, sale, saleSerial, isAddition, held, transfer, requiresInspection, inspectionResult]. */
const COUNT_SHEET_FIXTURES: readonly CountSheetFixture[] = (
  [
    [0, 0, 0, 1, 'venb', 'cusa', 'sala', 'srla', false, true, null, true, null],
    [
      1,
      1,
      1,
      null,
      'vena',
      null,
      'salb',
      null,
      true,
      false,
      TRANSFER_ID,
      false,
      false,
    ],
    [0, 2, null, 0, null, 'cusb', null, 'srlb', false, null, null, null, null],
    [
      1,
      1,
      0,
      1,
      'venb',
      'cusa',
      'sala',
      'srla',
      false,
      true,
      TRANSFER_ID,
      true,
      null,
    ],
    [
      0,
      0,
      1,
      null,
      'vena',
      'cusb',
      'salb',
      'srlb',
      true,
      false,
      null,
      false,
      true,
    ],
    [1, 1, 1, 0, null, null, null, null, false, null, null, true, false],
    [
      0,
      2,
      0,
      0,
      'venb',
      'cusa',
      'sala',
      'srla',
      false,
      true,
      TRANSFER_ID,
      false,
      null,
    ],
    [0, 0, 0, 1, 'vena', 'cusb', 'salb', 'srlb', true, false, null, true, null],
  ] as const
).map(
  ([
    material,
    batch,
    location,
    loader,
    vendorId,
    customerId,
    saleId,
    saleSerialId,
    isAddition,
    held,
    transferId,
    requiresInspection,
    inspectionResult,
  ]) => ({
    material,
    batch,
    location,
    loader,
    vendorId,
    customerId,
    saleId,
    saleSerialId,
    isAddition,
    held,
    transferId,
    requiresInspection,
    inspectionResult,
  }),
);

/** The 待檢驗 icon's rank: awaiting (2) > failed (1) > nothing to show (0). */
const inspectionRank = ({
  requiresInspection,
  inspectionResult,
}: CountSheetFixture): number =>
  requiresInspection === true && inspectionResult === null
    ? 2
    : inspectionResult === false
      ? 1
      : 0;

const inventoryCountOrderItemsCase: ListSortCase<InventoryCountOrderItemSortField> =
  {
    name: 'inventoryCountOrderItems',
    sortFields: InventoryCountOrderItemSortField,
    defaultOrder: [
      {
        field: InventoryCountOrderItemSortField.IS_ADDITION,
        order: SortOrder.DESC,
      },
      {
        field: InventoryCountOrderItemSortField.MATERIAL_KEY,
        order: SortOrder.ASC,
      },
      {
        field: InventoryCountOrderItemSortField.BATCH_KEY,
        order: SortOrder.ASC,
      },
    ],
    fetchPage: (ctx, request) =>
      graphqlPage<InventoryCountOrderItemSortField>(
        'inventoryCountOrderItems',
        `id: "${countSheetOrderId}"`,
      )(ctx, request),
    seed: async ({ dataSource, entities }) => {
      const created = day('2025-01-01');
      const [order] = await saveStamped<InventoryCountOrderEntityClass>(
        dataSource,
        InventoryCountOrderEntityClass,
        [
          {
            row: {
              key: 'icsheet1',
              name: 'sheetord',
              countDate: '2026-07-10',
              status: InventoryCountStatus.COUNTING,
            },
            createdAt: created,
          },
        ],
      );
      const materialRepository = dataSource.getRepository<MaterialEntityClass>(
        entities.material,
      );
      // Keys sort opposite to creation order on purpose.
      const materials = await materialRepository.save([
        materialRepository.create({
          key: 'icmatb',
          description: 'icdesa',
        } as DeepPartial<MaterialEntityClass>),
        materialRepository.create({
          key: 'icmata',
          description: 'icdesb',
        } as DeepPartial<MaterialEntityClass>),
      ]);
      const batchRepository = dataSource.getRepository<BatchEntityClass>(
        entities.batch,
      );
      const batches = await batchRepository.save(
        (
          [
            ['icbtb', 0],
            ['icbta', 1],
            ['icbta', 0],
          ] as const
        ).map(([key, material]) =>
          batchRepository.create({
            key,
            materialId: materials[material].id,
          } as DeepPartial<BatchEntityClass>),
        ),
      );
      const locations = await saveStamped<LocationEntityClass>(
        dataSource,
        entities.location,
        ['iclocb', 'icloca'].map((key) => ({
          row: {
            key,
            description: 'icloc',
          } as DeepPartial<LocationEntityClass>,
          createdAt: created,
        })),
      );
      const [loaderType] = await saveStamped(
        dataSource,
        LoaderTypeEntityClass,
        [{ row: { key: 'icltyp', description: 'icltyp' }, createdAt: created }],
      );
      const loaders = await saveStamped<LoadersEntityClass>(
        dataSource,
        LoadersEntityClass,
        ['icldrb', 'icldra'].map((serialId) => ({
          row: {
            serialId,
            typeId: loaderType.id,
            locationId: locations[0].id,
          } as DeepPartial<LoadersEntityClass>,
          createdAt: created,
        })),
      );
      const itemRepository = dataSource.getRepository(
        InventoryCountOrderItemEntityClass,
      );
      const saved = await COUNT_SHEET_FIXTURES.reduce<
        Promise<InventoryCountOrderItemEntityClass[]>
      >(async (acc, { material, batch, location, loader, ...columns }) => {
        const done = await acc;
        const item = await itemRepository.save(
          itemRepository.create({
            ...columns,
            orderId: order.id,
            materialId: materials[material].id,
            batchId: batches[batch].id,
            locationId: location === null ? null : locations[location].id,
            loaderId: loader === null ? null : loaders[loader].id,
          } as DeepPartial<InventoryCountOrderItemEntityClass>),
        );

        return [...done, item];
      }, Promise.resolve([]));

      countSheetOrderId = order.id;
      countSheetRows = new Map(
        saved.map(({ id }, index) => {
          const fixture = COUNT_SHEET_FIXTURES[index];
          const { location, loader } = fixture;

          return [
            id,
            {
              [InventoryCountOrderItemSortField.MATERIAL_KEY]:
                materials[fixture.material].key,
              [InventoryCountOrderItemSortField.MATERIAL_DESCRIPTION]:
                materials[fixture.material].description,
              [InventoryCountOrderItemSortField.BATCH_KEY]:
                batches[fixture.batch].key,
              [InventoryCountOrderItemSortField.LOCATION_KEY]:
                location === null ? null : locations[location].key,
              [InventoryCountOrderItemSortField.LOADER_SERIAL_ID]:
                loader === null ? null : loaders[loader].serialId,
              [InventoryCountOrderItemSortField.VENDOR_ID]: fixture.vendorId,
              [InventoryCountOrderItemSortField.CUSTOMER_ID]:
                fixture.customerId,
              [InventoryCountOrderItemSortField.SALE_ID]: fixture.saleId,
              [InventoryCountOrderItemSortField.SALE_SERIAL_ID]:
                fixture.saleSerialId,
              [InventoryCountOrderItemSortField.IS_ADDITION]:
                fixture.isAddition,
              // The sheet's icons read a NULL snapshot as "not held".
              [InventoryCountOrderItemSortField.HELD]: fixture.held ?? false,
              [InventoryCountOrderItemSortField.IN_TRANSFER]:
                fixture.transferId !== null,
              [InventoryCountOrderItemSortField.INSPECTION]:
                inspectionRank(fixture),
            },
          ];
        }),
      );

      return countSheetRows;
    },
  };

// ---------------------------------------------------------------------------
// Raw lists: their status / change type is computed, so fixtures go through
// the real services rather than straight into the tables.
// ---------------------------------------------------------------------------

const saveNamed = async <E extends { id: string }>(
  dataSource: DataSource,
  target: EntityTarget<E>,
  rows: readonly DeepPartial<E>[],
): Promise<E[]> =>
  saveStamped<E>(
    dataSource,
    target,
    rows.map((row) => ({ row, createdAt: day('2025-01-01') })),
  );

/** Create a one-line receive order and receive `received` of `target`. */
const receiveOrder = async (
  { app, dataSource }: ListSortContext,
  options: {
    key: string;
    description: string;
    materialKey: string;
    batchKey: string;
    locationKey: string;
    target: number;
    received: number;
  },
): Promise<string> => {
  const service = app.get(ReceiveInventoryOrderService);
  const order = await service.createReceiveInventoryOrder({
    key: options.key,
    description: options.description,
    items: [
      {
        serialId: `${options.key}-1`,
        materialKey: options.materialKey,
        batchKey: options.batchKey,
        locationKey: options.locationKey,
        targetReceivedQuantity: options.target,
        requireInspection: false,
      },
    ],
  });

  if (options.received > 0) {
    const [item] = await dataSource
      .getRepository(service.receiveInventoryOrderItemEntity)
      .find({ where: { orderId: order.id } });

    await app.get(WmsOperationRunner).run({}, () =>
      service.receive({
        itemId: item.id,
        quantity: options.received,
        batchKey: options.batchKey,
        locationKey: options.locationKey,
      }),
    );
  }

  return order.id;
};

/** Create a one-line ship order on existing stock and ship `shipped` of `target`. */
const shipOrder = async (
  { app, dataSource }: ListSortContext,
  options: {
    key: string;
    description: string;
    materialId: string;
    batchId: string;
    locationId: string;
    target: number;
    shipped: number;
  },
): Promise<string> => {
  const service = app.get(ShipInventoryOrderService);
  const runner = app.get(WmsOperationRunner);
  const orderId = await runner.run({}, async () => {
    const order = await service.createShipInventoryOrder({
      key: options.key,
      description: options.description,
      references: [],
    });

    await service.addShipInventoryOrderItems({
      orderId: order.id,
      items: [
        {
          materialId: options.materialId,
          batchId: options.batchId,
          locationId: options.locationId,
          targetShippedQuantity: options.target,
          status: StockStatus.FREE,
          serialId: `${options.key}-1`,
          orderId: order.id,
        },
      ],
    });

    return order.id;
  });

  if (options.shipped > 0) {
    const [item] = await dataSource
      .getRepository(service.shipInventoryOrderItemEntity)
      .find({ where: { orderId } });

    await runner.run({}, () =>
      service.ship({ itemId: item.id, quantity: options.shipped }),
    );
  }

  return orderId;
};

interface OrderListFixture {
  key: string;
  description: string;
  createdBy: string | null;
  createdAt: Date;
  /** Of a target of 2: 0 pending, 1 partial, 2 done. */
  moved: 0 | 1 | 2;
  removed: boolean;
}

const ORDER_LIST_FIXTURES = (prefix: string): readonly OrderListFixture[] =>
  (
    [
      ['01', 'odesb', 'usrb', '2026-08-03', 0, false],
      ['02', 'odesa', null, '2026-08-01', 1, false],
      ['03', 'odesb', 'usra', '2026-08-02', 2, false],
      ['04', 'odesa', 'usrb', '2026-08-02', 0, true],
      ['05', 'odesc', 'usra', '2026-08-05', 1, false],
      ['06', 'odesb', null, '2026-08-04', 2, false],
      ['07', 'odesa', 'usrb', '2026-08-04', 0, false],
    ] as const
  ).map(([suffix, description, createdBy, created, moved, removed]) => ({
    key: `${prefix}${suffix}`,
    description,
    createdBy,
    createdAt: day(created),
    moved,
    removed,
  }));

/** Lifecycle rank both order lists sort their status by. */
const orderStatusRank = ({ moved, removed }: OrderListFixture): number =>
  removed ? 3 : moved;

/** Stamp what the services do not take: creator, creation time, removal. */
const stampOrder = async (
  dataSource: DataSource,
  target: EntityTarget<{ id: string }>,
  id: string,
  fixture: OrderListFixture,
): Promise<void> => {
  await dataSource.getRepository(target).update(id, {
    createdBy: fixture.createdBy,
    createdAt: fixture.createdAt,
    removedAt: fixture.removed ? day('2026-09-01') : null,
  } as never);
};

const receiveOrdersCase: ListSortCase<ReceiveInventoryOrderSortField> = {
  name: 'receiveInventoryOrders',
  sortFields: ReceiveInventoryOrderSortField,
  defaultOrder: newestFirst(ReceiveInventoryOrderSortField.CREATED_AT),
  fetchPage: graphqlPage<ReceiveInventoryOrderSortField>(
    'receiveInventoryOrders',
    'key: "rcvo"',
  ),
  seed: async (ctx) => {
    const { app, dataSource, entities } = ctx;

    await saveNamed<MaterialEntityClass>(dataSource, entities.material, [
      { key: 'rcvmat' } as DeepPartial<MaterialEntityClass>,
    ]);
    await saveNamed<LocationEntityClass>(dataSource, entities.location, [
      {
        key: 'rcvloc',
        description: 'rcvloc',
      } as DeepPartial<LocationEntityClass>,
    ]);

    const fixtures = ORDER_LIST_FIXTURES('rcvo');
    const service = app.get(ReceiveInventoryOrderService);
    const ids = await fixtures.reduce<Promise<string[]>>(
      async (acc, fixture) => {
        const done = await acc;
        const id = await receiveOrder(ctx, {
          key: fixture.key,
          description: fixture.description,
          materialKey: 'rcvmat',
          batchKey: 'rcvbat',
          locationKey: 'rcvloc',
          target: 2,
          received: fixture.moved,
        });

        await stampOrder(
          dataSource,
          service.receiveInventoryOrderEntity,
          id,
          fixture,
        );

        return [...done, id];
      },
      Promise.resolve([]),
    );

    return new Map(
      ids.map((id, index) => {
        const fixture = fixtures[index];

        return [
          id,
          {
            [ReceiveInventoryOrderSortField.STATUS]: orderStatusRank(fixture),
            [ReceiveInventoryOrderSortField.KEY]: fixture.key,
            [ReceiveInventoryOrderSortField.CREATED_BY]: fixture.createdBy,
            [ReceiveInventoryOrderSortField.CREATED_AT]: fixture.createdAt,
            [ReceiveInventoryOrderSortField.DESCRIPTION]: fixture.description,
          },
        ];
      }),
    );
  },
};

const shipOrdersCase: ListSortCase<ShipInventoryOrderSortField> = {
  name: 'shipInventoryOrders',
  sortFields: ShipInventoryOrderSortField,
  defaultOrder: newestFirst(ShipInventoryOrderSortField.CREATED_AT),
  fetchPage: graphqlPage<ShipInventoryOrderSortField>(
    'shipInventoryOrders',
    'key: "shpo"',
  ),
  seed: async (ctx) => {
    const { app, dataSource, entities } = ctx;
    const [material] = await saveNamed<MaterialEntityClass>(
      dataSource,
      entities.material,
      [{ key: 'shpmat' } as DeepPartial<MaterialEntityClass>],
    );
    const [location] = await saveNamed<LocationEntityClass>(
      dataSource,
      entities.location,
      [
        {
          key: 'shploc',
          description: 'shploc',
        } as DeepPartial<LocationEntityClass>,
      ],
    );

    // Stock to ship from; its receive order's key stays out of `rcvo`.
    await receiveOrder(ctx, {
      key: 'stko01',
      description: 'stock',
      materialKey: 'shpmat',
      batchKey: 'shpbat',
      locationKey: 'shploc',
      target: 100,
      received: 100,
    });

    const batch = await dataSource
      .getRepository<BatchEntityClass>(entities.batch)
      .findOneByOrFail({ key: 'shpbat', materialId: material.id });
    const fixtures = ORDER_LIST_FIXTURES('shpo');
    const service = app.get(ShipInventoryOrderService);
    const ids = await fixtures.reduce<Promise<string[]>>(
      async (acc, fixture) => {
        const done = await acc;
        const id = await shipOrder(ctx, {
          key: fixture.key,
          description: fixture.description,
          materialId: material.id,
          batchId: batch.id,
          locationId: location.id,
          target: 2,
          shipped: fixture.moved,
        });

        await stampOrder(
          dataSource,
          service.shipInventoryOrderEntity,
          id,
          fixture,
        );

        return [...done, id];
      },
      Promise.resolve([]),
    );

    return new Map(
      ids.map((id, index) => {
        const fixture = fixtures[index];

        return [
          id,
          {
            [ShipInventoryOrderSortField.STATUS]: orderStatusRank(fixture),
            [ShipInventoryOrderSortField.KEY]: fixture.key,
            [ShipInventoryOrderSortField.CREATED_BY]: fixture.createdBy,
            [ShipInventoryOrderSortField.CREATED_AT]: fixture.createdAt,
            [ShipInventoryOrderSortField.DESCRIPTION]: fixture.description,
          },
        ];
      }),
    );
  },
};

/** Set by the change log seed: each history row's stamped `createdAt`. */
let changeLogCreatedAt: ReadonlyMap<string, Date> = new Map();

const CHANGE_TYPE_ORDER: readonly ChangeType[] = Object.values(ChangeType);

const changeLogsCase: ListSortCase<ChangeLogSortField> = {
  name: 'changeLogs',
  sortFields: ChangeLogSortField,
  defaultOrder: newestFirst(ChangeLogSortField.CREATED_AT),
  fetchPage: graphqlPage<ChangeLogSortField>(
    'changeLogs',
    'materialKey: "clm"',
  ),
  seed: async (ctx) => {
    const { app, dataSource, entities } = ctx;
    const [unitB, unitA] = await dataSource
      .getRepository(UnitEntityClass)
      .save([{ key: 'clunb' }, { key: 'cluna' }]);
    // A unit that no longer exists: the BASE_UNIT join yields NULL.
    const orphanUnitId = '00000000-0000-4000-8000-0000000000cc';
    const materials = await saveNamed<MaterialEntityClass>(
      dataSource,
      entities.material,
      [
        { key: 'clmatb', description: 'cldesa', baseUnit: unitB.id },
        { key: 'clmata', description: 'cldesb', baseUnit: unitA.id },
        { key: 'clmatc', description: 'cldesa', baseUnit: orphanUnitId },
      ] as DeepPartial<MaterialEntityClass>[],
    );
    const locations = await saveNamed<LocationEntityClass>(
      dataSource,
      entities.location,
      [
        { key: 'cllocb', description: 'clloc' },
        { key: 'clloca', description: 'clloc' },
      ] as DeepPartial<LocationEntityClass>[],
    );

    // Six receipts (RECEIVED rows) ...
    const receipts = [
      [0, 'clbtb', 0, 3],
      [1, 'clbta', 1, 10],
      [2, 'clbta', 1, 3],
      [0, 'clbta', 0, 5],
      [1, 'clbtb', 1, 3],
      [2, 'clbtb', 0, 5],
    ] as const;

    await receipts.reduce<Promise<void>>(
      async (acc, [material, batchKey, location, quantity], index) => {
        await acc;
        await receiveOrder(ctx, {
          key: `clro0${index}`,
          description: 'clrcv',
          materialKey: materials[material].key,
          batchKey,
          locationKey: locations[location].key,
          target: quantity,
          received: quantity,
        });
      },
      Promise.resolve(),
    );

    // ... and two shipments (SHIPPED rows), so the change type has duplicates.
    const batchRepository = dataSource.getRepository<BatchEntityClass>(
      entities.batch,
    );
    // A shipment of 5 sorts between the receipts by magnitude but first by
    // signed value, so the QUANTITY case tells the two apart. (Its slot holds
    // 10: the ship order's own target is taken out of the FREE stock first.)
    const shipments = [
      [0, 'clbtb', 0, 1],
      [1, 'clbta', 1, 5],
    ] as const;

    await shipments.reduce<Promise<void>>(
      async (acc, [material, batchKey, location, quantity], index) => {
        await acc;

        const batch = await batchRepository.findOneByOrFail({
          key: batchKey,
          materialId: materials[material].id,
        });

        await shipOrder(ctx, {
          key: `clso0${index}`,
          description: 'clshp',
          materialId: materials[material].id,
          batchId: batch.id,
          locationId: locations[location].id,
          target: quantity,
          shipped: quantity,
        });
      },
      Promise.resolve(),
    );

    // Read the history back for its ids and computed change types, then stamp
    // creation times with duplicates (rows written together share `now()`).
    const [rows] = await app
      .get(StockService)
      .findChangeLogs({ materialKey: 'clm' });
    const stamps = ['2026-10-02', '2026-10-01', '2026-10-03'].map(day);
    const stockRepository = dataSource.getRepository<StockEntityClass>(
      entities.stock,
    );

    changeLogCreatedAt = new Map(
      rows.map(({ id }, index) => [id, stamps[index % stamps.length]]),
    );

    await [...changeLogCreatedAt].reduce<Promise<void>>(
      async (acc, [id, createdAt]) => {
        await acc;
        await stockRepository.update(id, { createdAt } as never);
      },
      Promise.resolve(),
    );

    const materialById = new Map(materials.map((m) => [m.id, m]));
    const unitKeys = new Map([
      [unitA.id, unitA.key],
      [unitB.id, unitB.key],
    ]);
    const batchKeys = new Map(
      (await batchRepository.find()).map(({ id, key }) => [id, key]),
    );
    const locationKeys = new Map(locations.map(({ id, key }) => [id, key]));

    return new Map(
      rows.map((row) => {
        const material = materialById.get(row.materialId);

        return [
          row.id,
          {
            [ChangeLogSortField.CHANGE_TYPE]: CHANGE_TYPE_ORDER.indexOf(
              row.changeType,
            ),
            [ChangeLogSortField.MATERIAL_KEY]: material?.key ?? null,
            [ChangeLogSortField.MATERIAL_DESCRIPTION]:
              material?.description ?? null,
            [ChangeLogSortField.BATCH_KEY]: batchKeys.get(row.batchId) ?? null,
            [ChangeLogSortField.LOCATION_KEY]:
              locationKeys.get(row.locationId) ?? null,
            // `changeLogs` shows the magnitude; the sign is the change type's.
            [ChangeLogSortField.QUANTITY]: Math.abs(Number(row.quantity)),
            [ChangeLogSortField.BASE_UNIT]:
              unitKeys.get(String(material?.baseUnit)) ?? null,
            [ChangeLogSortField.CREATED_AT]:
              changeLogCreatedAt.get(row.id) ?? null,
          },
        ];
      }),
    );
  },
};
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

  describeListSort(locationsCase, () => context);
  describeListSort(loaderTypesCase, () => context);
  describeListSort(loadersCase, () => context);

  describe('location and loader lists called directly', () => {
    it('LocationService.findMany defaults to newest first, then id', () =>
      expectDirectDefaultOrder(
        (page) =>
          app.get(LocationService).findMany({ description: 'locd', ...page }),
        (row) => ({ createdAt: row.createdAt }),
        [{ field: 'createdAt', order: SortOrder.DESC }],
      ));

    it('LoaderService.findManyLoaderTypes defaults to newest first, then id', () =>
      expectDirectDefaultOrder(
        (page) =>
          app
            .get(CoreLoaderService)
            .findManyLoaderTypes({ description: 'ltd', ...page }),
        (row) => ({ createdAt: row.createdAt }),
        [{ field: 'createdAt', order: SortOrder.DESC }],
      ));

    it('LoaderService.findManyLoaders defaults to newest first, then id', () =>
      expectDirectDefaultOrder(
        (page) =>
          app
            .get(CoreLoaderService)
            .findManyLoaders({ loaderTypeKey: 'ltyp', ...page }),
        (row) => ({ createdAt: row.createdAt }),
        [{ field: 'createdAt', order: SortOrder.DESC }],
      ));
  });

  describeListSort(transferOrdersCase, () => context);
  describeListSort(consumptionOrdersCase, () => context);

  describeListSort(inventoryCountOrdersCase, () => context);
  describeListSort(inventoryCountOrderItemsCase, () => context);

  describeListSort(receiveOrdersCase, () => context);
  describeListSort(shipOrdersCase, () => context);
  describeListSort(changeLogsCase, () => context);

  describe('raw lists called directly', () => {
    it('ReceiveInventoryOrderService.findMany defaults to newest first, then id', () =>
      expectDirectDefaultOrder(
        (page) =>
          app.get(ReceiveInventoryOrderService).findMany({
            wildcard: { key: 'key', value: 'rcvo' },
            ...page,
          }),
        (row) => ({ createdAt: row.createdAt }),
        [{ field: 'createdAt', order: SortOrder.DESC }],
      ));

    it('ShipInventoryOrderService.findMany defaults to newest first, then id', () =>
      expectDirectDefaultOrder(
        (page) =>
          app.get(ShipInventoryOrderService).findMany({
            wildcard: { key: 'key', value: 'shpo' },
            ...page,
          }),
        (row) => ({ createdAt: row.createdAt }),
        [{ field: 'createdAt', order: SortOrder.DESC }],
      ));

    it('StockService.findChangeLogs defaults to newest first, then id', () =>
      expectDirectDefaultOrder(
        (page) =>
          app.get(StockService).findChangeLogs({ materialKey: 'clm', ...page }),
        (row) => ({ createdAt: changeLogCreatedAt.get(row.id) ?? null }),
        [{ field: 'createdAt', order: SortOrder.DESC }],
      ));
  });

  describe('inventory count lists called directly', () => {
    it('InventoryCountOrderService.findMany defaults to latest count date, then newest, then id', () =>
      expectDirectDefaultOrder(
        (page) =>
          app
            .get(InventoryCountOrderService)
            .findMany({ name: 'cnt', ...page }),
        (row) => ({ countDate: row.countDate, createdAt: row.createdAt }),
        [
          { field: 'countDate', order: SortOrder.DESC },
          { field: 'createdAt', order: SortOrder.DESC },
        ],
      ));

    it('InventoryCountOrderService.findItems defaults to additions, material key, batch key, then id', () =>
      expectDirectDefaultOrder(
        (page) =>
          app
            .get(InventoryCountOrderService)
            .findItems(countSheetOrderId, { ...page }),
        (row) => {
          const values = countSheetRows.get(row.id);

          if (!values) throw new Error(`unseeded count line ${row.id}`);

          return values;
        },
        inventoryCountOrderItemsCase.defaultOrder,
      ));
  });

  describe('order lists called directly', () => {
    it('TransferOrderService.findMany defaults to newest first, then id', () =>
      expectDirectDefaultOrder(
        (page) =>
          app.get(TransferOrderService).findMany({ key: 'trfo', ...page }),
        (row) => ({ createdAt: row.createdAt }),
        [{ field: 'createdAt', order: SortOrder.DESC }],
      ));

    it('ConsumptionOrderService.findMany defaults to newest first, then id', () =>
      expectDirectDefaultOrder(
        (page) =>
          app.get(ConsumptionOrderService).findMany({ key: 'cnso', ...page }),
        (row) => ({ createdAt: row.createdAt }),
        [{ field: 'createdAt', order: SortOrder.DESC }],
      ));
  });

  // No UI sorts these two, so they take no `sort`; they only had no ORDER BY.
  describe('hold and allocate lists called directly', () => {
    const stampDays = [
      '2026-04-03',
      '2026-04-01',
      '2026-04-02',
      '2026-04-02',
      '2026-04-05',
      '2026-04-01',
    ];

    beforeAll(async () => {
      await saveStamped<HoldInventoryOrderEntityClass>(
        context.dataSource,
        HoldInventoryOrderEntityClass,
        stampDays.map((created, index) => ({
          row: { key: `hldo0${index}` },
          createdAt: day(created),
        })),
      );
      await saveStamped<AllocateInventoryOrderEntityClass>(
        context.dataSource,
        AllocateInventoryOrderEntityClass,
        stampDays.map((created, index) => ({
          row: { key: `alco0${index}` },
          createdAt: day(created),
        })),
      );
    });

    it('HoldInventoryOrderService.findMany is newest first, then id', () =>
      expectDirectDefaultOrder(
        (page) =>
          app.get(HoldInventoryOrderService).findMany({ key: 'hldo', ...page }),
        (row) => ({ createdAt: row.createdAt }),
        [{ field: 'createdAt', order: SortOrder.DESC }],
      ));

    it('AllocateInventoryOrderService.findMany is newest first, then id', () =>
      expectDirectDefaultOrder(
        (page) =>
          app
            .get(AllocateInventoryOrderService)
            .findMany({ key: 'alco', ...page }),
        (row) => ({ createdAt: row.createdAt }),
        [{ field: 'createdAt', order: SortOrder.DESC }],
      ));
  });

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
