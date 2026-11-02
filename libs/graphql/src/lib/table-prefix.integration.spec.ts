import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from 'pg';
import {
  Column,
  DataSource,
  DefaultNamingStrategy,
  Entity,
  getMetadataArgsStorage,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type DataSourceOptions,
  type DeepPartial,
  type EntityMetadata,
} from 'typeorm';

type PostgresConnectionOptions = Extract<
  DataSourceOptions,
  { type: 'postgres' }
>;
import {
  applyWmsTablePrefix,
  ConsumptionOrderService,
  InventoryCountOrderService,
  LocationEntityClass,
  MaterialEntityClass,
  ReceiveInventoryOrderService,
  StockService,
  TransferOrderService,
  WmsEntities,
  WmsModuleCoreModule,
  WmsOperationRunner,
  getWmsTablePrefix,
  withWmsTablePrefix,
  type WmsAfterEventContext,
  type WmsStockEventName,
} from '@rytass/wms-module-core';

/**
 * `withWmsTablePrefix`, held to the five constraints a host with its own
 * schema put on it (Shuttle):
 *
 * 1. a host entity with exactly base's class name **and** table name
 *    (`LocationEntity` on `locations`) keeps its table, and our relations bind
 *    to `wms_locations`, not to it;
 * 2. no WMS table escapes the prefix;
 * 3. every constraint name the host's naming strategy derives for its own
 *    entities is byte-for-byte what `DefaultNamingStrategy` derives;
 * 4. applying twice is a no-op, a second, different prefix throws;
 * 5. receive, transfer, consumption and an inventory count all work end to
 *    end under the prefix, events and the count lock included.
 *
 * Driven through the service layer only, with no GraphQL module mounted —
 * which is how a host like Shuttle uses the package.
 *
 * Requires a reachable PostgreSQL; override with WMS_TEST_DB_* env vars.
 */
const DB_HOST = process.env['WMS_TEST_DB_HOST'] ?? 'localhost';
const DB_PORT = Number(process.env['WMS_TEST_DB_PORT'] ?? 5432);
const DB_USER =
  process.env['WMS_TEST_DB_USER'] ?? process.env['USER'] ?? 'postgres';
const DB_PASS = process.env['WMS_TEST_DB_PASS'];
const DB_NAME =
  process.env['WMS_TEST_PREFIX_DB_NAME'] ?? 'wms_module_prefix_test';

const PREFIX = 'wms_';

/*
 * The host's own location master. Same class name and same table name as
 * `@rytass/wms-base-nestjs-module`'s root — the collision the prefix exists to
 * survive.
 */
@Entity('locations')
class LocationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'varchar' })
  code!: string;
}

/** A host entity pointing at its own `locations` by string, as hosts do. */
@Entity('host_shelves')
class HostShelfEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  locationId!: string;

  @ManyToOne('locations')
  @JoinColumn({ name: 'locationId' })
  location!: LocationEntity;
}

const HOST_TABLES: readonly string[] = ['locations', 'host_shelves'];

const connectionOptions = (): PostgresConnectionOptions => ({
  type: 'postgres',
  host: DB_HOST,
  port: DB_PORT,
  username: DB_USER,
  password: DB_PASS,
  database: DB_NAME,
  synchronize: true,
  uuidExtension: 'uuid-ossp',
});

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

const stockEvents: WmsStockEventName[] = [];

const recordStockEvent = async (
  context: WmsAfterEventContext,
): Promise<void> => {
  stockEvents.push(context.event as WmsStockEventName);
};

const RECORDED_EVENTS: readonly WmsStockEventName[] = [
  'stock.received',
  'stock.in-transfer',
  'stock.transferred',
  'stock.issued',
  'stock.consumed',
  'stock.count-gained',
  'stock.count-lost',
];

const buildApp = async (
  coreOverrides: { readonly tablePrefix?: string } = {},
): Promise<INestApplication> => {
  const moduleRef = await Test.createTestingModule({
    imports: [
      TypeOrmModule.forRootAsync({
        useFactory: () =>
          withWmsTablePrefix(
            { ...connectionOptions(), autoLoadEntities: true },
            PREFIX,
          ),
      }),
      TypeOrmModule.forFeature([LocationEntity, HostShelfEntity]),
      WmsModuleCoreModule.forRootAsync({
        useFactory: async () => ({}),
        defaultLoaderSerialId: 'DEFAULT',
        defaultLoaderTypeKey: 'DEFAULT',
        defaultLocationKey: 'DEFAULT',
        afterListeners: Object.fromEntries(
          RECORDED_EVENTS.map((event) => [event, recordStockEvent]),
        ),
        ...coreOverrides,
      }),
    ],
  }).compile();

  const app = moduleRef.createNestApplication();

  await app.init();

  return app;
};

describe('table prefix (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let entities: WmsEntities;
  let stockService: StockService;
  let runner: WmsOperationRunner;

  /*
   * Everything registered that the host did not declare. Deliberately not
   * derived from the package's own class list: that is the input under test.
   */
  const HOST_CLASSES: ReadonlySet<unknown> = new Set<unknown>([
    LocationEntity,
    HostShelfEntity,
  ]);

  const isOwned = (metadata: EntityMetadata): boolean =>
    !HOST_CLASSES.has(metadata.target);

  const ownedTargets = (): ReadonlySet<unknown> =>
    new Set<unknown>(
      dataSource.entityMetadatas.filter(isOwned).map(({ target }) => target),
    );

  beforeAll(async () => {
    await resetDatabase();

    app = await buildApp({ tablePrefix: PREFIX });
    dataSource = app.get(DataSource);
    entities = app.get(WmsEntities);
    stockService = app.get(StockService);
    runner = app.get(WmsOperationRunner);
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('1. a host entity sharing base’s class and table name', () => {
    it('keeps the host on `locations` and moves ours to `wms_locations`', () => {
      expect(dataSource.getMetadata(LocationEntity).tableName).toBe(
        'locations',
      );
      expect(dataSource.getMetadata(entities.location).tableName).toBe(
        'wms_locations',
      );
    });

    it('binds every relation declared on a WMS entity to a WMS table', () => {
      const wmsRelations = dataSource.entityMetadatas
        .filter(isOwned)
        .flatMap((metadata) =>
          metadata.relations.map((relation) => ({
            owner: `${metadata.targetName}.${relation.propertyName}`,
            target: relation.inverseEntityMetadata.tableName,
          })),
        );

      expect(wmsRelations.length).toBeGreaterThan(50);
      expect(
        wmsRelations.filter(({ target }) => !target.startsWith(PREFIX)),
      ).toEqual([]);
    });

    it('binds the string relations to `locations` / `loaders` / `orders` to ours', () => {
      const stringTargets = ['locations', 'loaders', 'orders'];
      const relationArgs = getMetadataArgsStorage().relations.filter(
        (relation) => ownedTargets().has(relation.target),
      );
      const rewritten = relationArgs.filter(
        (relation) =>
          typeof relation.type === 'string' &&
          stringTargets.some((name) => relation.type === `${PREFIX}${name}`),
      );

      expect(rewritten.length).toBeGreaterThan(20);
      expect(
        relationArgs.filter(
          (relation) =>
            typeof relation.type === 'string' &&
            stringTargets.includes(relation.type),
        ),
      ).toEqual([]);
    });

    it('leaves the host’s own string relation on the host table', () => {
      const relation = dataSource
        .getMetadata(HostShelfEntity)
        .relations.find(({ propertyName }) => propertyName === 'location');

      expect(relation?.inverseEntityMetadata.target).toBe(LocationEntity);
      expect(relation?.inverseEntityMetadata.tableName).toBe('locations');
    });
  });

  describe('2. no WMS table escapes the prefix', () => {
    it('lists only prefixed tables besides the host’s', async () => {
      const rows: { table_name: string }[] = await dataSource.query(
        `SELECT table_name FROM information_schema.tables
          WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
      );
      const names = rows.map(({ table_name }) => table_name);

      expect(
        names.filter(
          (name) => !name.startsWith(PREFIX) && !HOST_TABLES.includes(name),
        ),
      ).toEqual([]);
      expect(names).toEqual(
        expect.arrayContaining([
          'wms_sequences',
          'wms_stocks',
          'wms_batches',
          'wms_transfer_order_changes',
          ...HOST_TABLES,
        ]),
      );
    });
  });

  describe('3. host constraint names are DefaultNamingStrategy’s, verbatim', () => {
    const naming = new DefaultNamingStrategy();

    const constraintNames = async (
      table: string,
    ): Promise<{ readonly type: string; readonly name: string }[]> =>
      dataSource.query(
        `SELECT contype AS "type", conname AS "name" FROM pg_constraint
          WHERE conrelid = $1::regclass
            -- PostgreSQL 18 also lists NOT NULL as named constraints ('n'),
            -- named by the server rather than by any naming strategy.
            AND contype IN ('p', 'f', 'u', 'c', 'x')
          ORDER BY conname`,
        [`"${table}"`],
      );

    const indexNames = async (table: string): Promise<string[]> =>
      (
        (await dataSource.query(
          `SELECT indexname FROM pg_indexes WHERE tablename = $1 ORDER BY indexname`,
          [table],
        )) as { indexname: string }[]
      ).map(({ indexname }) => indexname);

    it('names the host tables, keys and indices exactly as the default would', async () => {
      expect(naming.tableName('LocationEntity', 'locations')).toBe(
        dataSource.getMetadata(LocationEntity).tableName,
      );
      expect(naming.tableName('HostShelfEntity', 'host_shelves')).toBe(
        dataSource.getMetadata(HostShelfEntity).tableName,
      );

      expect(await constraintNames('locations')).toEqual([
        { type: 'p', name: naming.primaryKeyName('locations', ['id']) },
      ]);
      expect(await constraintNames('host_shelves')).toEqual(
        [
          { type: 'p', name: naming.primaryKeyName('host_shelves', ['id']) },
          {
            type: 'f',
            name: naming.foreignKeyName(
              'host_shelves',
              ['locationId'],
              'locations',
              ['id'],
            ),
          },
        ].sort((left, right) => left.name.localeCompare(right.name)),
      );
      expect(await indexNames('locations')).toEqual(
        [
          naming.primaryKeyName('locations', ['id']),
          naming.indexName('locations', ['code']),
        ].sort(),
      );
    });

    it('derives the same names as a DataSource without the prefix', () => {
      const [hostLocation, hostShelf] = [LocationEntity, HostShelfEntity].map(
        (target) => dataSource.getMetadata(target),
      );

      expect(hostLocation.indices.map(({ name }) => name)).toEqual([
        naming.indexName('locations', ['code']),
      ]);
      expect(hostShelf.foreignKeys.map(({ name }) => name)).toEqual([
        naming.foreignKeyName('host_shelves', ['locationId'], 'locations', [
          'id',
        ]),
      ]);
    });
  });

  describe('4. idempotent, and one prefix per process', () => {
    it('does not double the prefix when applied again', () => {
      applyWmsTablePrefix(PREFIX);
      applyWmsTablePrefix(PREFIX);

      expect(getWmsTablePrefix()).toBe(PREFIX);
      expect(
        getMetadataArgsStorage()
          .tables.filter((table) => ownedTargets().has(table.target))
          .filter((table) => table.name)
          .filter((table) => table.name?.startsWith(`${PREFIX}${PREFIX}`)),
      ).toEqual([]);
    });

    it('refuses a different prefix', () => {
      expect(() => applyWmsTablePrefix('other_')).toThrow(/already "wms_"/);
    });
  });

  describe('5. the stock flows, end to end under the prefix', () => {
    let materialId: string;
    let shelfId: string;
    let benchId: string;
    let lineId: string;
    let batchId: string;

    const onHand = async (locationId: string): Promise<number> => {
      const [rows] = await stockService.findAggregatedStocks({
        materialId,
        locationId,
      });

      return rows.reduce((sum, row) => sum + Number(row.quantity), 0);
    };

    const location = async (key: string): Promise<string> => {
      const repository = dataSource.getRepository<LocationEntityClass>(
        entities.location,
      );

      return (
        await repository.save(
          repository.create({
            key,
            description: key,
            isActive: true,
          } as DeepPartial<LocationEntityClass>),
        )
      ).id;
    };

    beforeAll(async () => {
      shelfId = await location('PFX-SHELF');
      benchId = await location('PFX-BENCH');
      lineId = await location('PFX-LINE');

      const materialRepository = dataSource.getRepository<MaterialEntityClass>(
        entities.material,
      );
      materialId = (
        await materialRepository.save(
          materialRepository.create({
            key: 'PFX-MATERIAL',
          } as DeepPartial<MaterialEntityClass>),
        )
      ).id;
    });

    beforeEach(() => {
      stockEvents.length = 0;
    });

    it('receives onto the named batch', async () => {
      const service = app.get(ReceiveInventoryOrderService);

      await runner.run({}, async () => {
        const order = await service.createReceiveInventoryOrder({
          key: 'PFX-RCV',
          description: 'prefix',
          items: [
            {
              serialId: 'PFX-RCV-1',
              materialKey: 'PFX-MATERIAL',
              batchKey: 'PFX-LOT',
              locationKey: 'PFX-SHELF',
              targetReceivedQuantity: 10,
              requireInspection: false,
            },
          ],
        });
        const [item] = await dataSource
          .getRepository(service.receiveInventoryOrderItemEntity)
          .find({ where: { orderId: order.id } });

        await service.receive({ itemId: item.id, quantity: 10 });
      });

      const [[stock]] = await stockService.findAggregatedStocks({
        materialId,
        locationId: shelfId,
      });

      batchId = stock.batchId;
      expect(await onHand(shelfId)).toBe(10);
      expect(stockEvents).toContain('stock.received');
    });

    it('transfers between locations', async () => {
      const service = app.get(TransferOrderService);

      await runner.run({}, async () => {
        const order = await service.createTransferOrder({
          locationId: benchId,
          items: [
            {
              locationId: shelfId,
              materialId,
              batchId,
              targetTransferredQuantity: 3,
            } as never,
          ],
        });
        const [item] = await dataSource
          .getRepository(service.transferOrderItemEntity)
          .find({ where: { orderId: order.id } });

        await service.transfer({ itemId: item.id, quantity: 3 });
      });

      expect(await onHand(shelfId)).toBe(7);
      expect(await onHand(benchId)).toBe(3);
      expect(stockEvents).toEqual(
        expect.arrayContaining(['stock.in-transfer', 'stock.transferred']),
      );
    });

    it('issues and settles a consumption order', async () => {
      const service = app.get(ConsumptionOrderService);

      await runner.run({}, async () => {
        const order = await service.createConsumptionOrder({
          items: [
            {
              materialId,
              batchId,
              locationId: shelfId,
              targetLocationId: lineId,
              quantity: 2,
            },
          ],
        });

        await service.issue({ orderId: order.id });
        await service.settle({ orderId: order.id });
      });

      expect(await onHand(shelfId)).toBe(5);
      expect(await onHand(lineId)).toBe(0);
      expect(stockEvents).toEqual(
        expect.arrayContaining(['stock.issued', 'stock.consumed']),
      );
    });

    it('locks a counted location, then settles the count', async () => {
      const counts = app.get(InventoryCountOrderService);
      const transfers = app.get(TransferOrderService);

      const order = await counts.create({
        name: 'PFX-COUNT',
        countDate: '2026-11-02',
        locationIds: [benchId],
      });

      await counts.start(order.id);

      // The count lock still recognises our (prefixed) change tables.
      await expect(
        transfers.createTransferOrder({
          locationId: shelfId,
          items: [
            {
              locationId: benchId,
              materialId,
              batchId,
              targetTransferredQuantity: 1,
            } as never,
          ],
        }),
      ).rejects.toThrow(/is locked by inventory count order/);

      const [items] = await counts.findItems(order.id);

      expect(items.map(({ bookQuantity }) => Number(bookQuantity))).toEqual([
        3,
      ]);

      await runner.run({}, async () => {
        await counts.count(
          order.id,
          items.map(({ id }) => ({ itemId: id, countedQuantity: 1 })),
        );
        await counts.settle(order.id);
      });

      expect(await onHand(benchId)).toBe(1);
      expect(stockEvents).toContain('stock.count-lost');
    });
  });

  describe('6. sequences take the prefix too', () => {
    it('creates the order-key sequences under the prefix', async () => {
      const rows: { sequence_name: string }[] = await dataSource.query(
        `SELECT sequence_name FROM information_schema.sequences
          WHERE sequence_schema = 'public'`,
      );
      const names = rows.map(({ sequence_name }) => sequence_name);

      // RCV / TO / consumption keys were all issued above.
      expect(names.length).toBeGreaterThan(0);
      expect(names.filter((name) => !name.startsWith(PREFIX))).toEqual([]);
    });
  });

  describe('7. `tablePrefix` is checked at startup', () => {
    it('starts when the tables carry the declared prefix', () => {
      expect(app).toBeDefined();
    });

    it('refuses to start when they do not', async () => {
      await expect(buildApp({ tablePrefix: 'nope_' })).rejects.toThrow(
        /tablePrefix|prefix/,
      );
    });
  });
});
