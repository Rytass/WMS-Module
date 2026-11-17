import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GraphQLModule, GraphQLSchemaHost } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { TypeOrmModule } from '@nestjs/typeorm';
import { graphql, type GraphQLSchema } from 'graphql';
import { Client } from 'pg';
import { DataSource, type DeepPartial, type EntityTarget } from 'typeorm';
import {
  AllocateInventoryOrderEntityClass,
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
  MaterialEntityClass,
  MaterialService,
  MaterialSortField,
  SortOrder,
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

  describe('order lists called directly', () => {
    it('TransferOrderService.findMany defaults to newest first, then id', () =>
      expectDirectDefaultOrder(
        (page) =>
          app.get(TransferOrderService).findMany({ key: 'trfo', ...page }),
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
});
