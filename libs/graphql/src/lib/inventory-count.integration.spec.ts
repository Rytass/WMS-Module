import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GraphQLModule, GraphQLSchemaHost } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from 'pg';
import { DataSource, type DeepPartial } from 'typeorm';
import { ExecutionResult, GraphQLSchema, graphql } from 'graphql';
import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import {
  BatchService,
  InventoryCountOrderService,
  InventoryCountStatus,
  LocationEntityClass,
  MaterialEntityClass,
  ReceiveInventoryOrderService,
  ScrapeService,
  ShipInventoryOrderService,
  StockEntityClass,
  StockService,
  StockStatus,
  TransferOrderService,
  WmsEntities,
} from '@rytass/wms-module-core';
import { getWmsTablePrefix } from '@rytass/wms-module-core';
import { WmsModuleGraphqlModule } from './graphql.module';
import { LoaderService, createWmsLoaders } from './helpers';

/**
 * End-to-end behaviour of inventory counting, transcribed from the "D. 盤點"
 * design flow.
 *
 * The three properties worth proving are the ones that would silently corrupt
 * stock if they were wrong:
 *
 * 1. the scope expands down the location tree, so counting an aisle counts its
 *    shelves;
 * 2. starting a count locks that scope, so the book snapshot stays true — and
 *    the lock catches a service called **directly**, not just a resolver;
 * 3. settlement writes the difference, in one transaction, and only for lines
 *    somebody actually counted.
 *
 * Requires a reachable PostgreSQL; override with WMS_TEST_DB_* env vars.
 */

/** One of our tables, as it is named under `WMS_TEST_TABLE_PREFIX`. */
const t = (name: string): string => `"${getWmsTablePrefix()}${name}"`;

const DB_HOST = process.env['WMS_TEST_DB_HOST'] ?? 'localhost';
const DB_PORT = Number(process.env['WMS_TEST_DB_PORT'] ?? 5432);
const DB_USER =
  process.env['WMS_TEST_DB_USER'] ?? process.env['USER'] ?? 'postgres';
const DB_PASS = process.env['WMS_TEST_DB_PASS'];
const DB_NAME =
  process.env['WMS_TEST_COUNT_DB_NAME'] ?? 'wms_module_inventory_count_test';

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

describe('inventory counting (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let entities: WmsEntities;
  let countService: InventoryCountOrderService;
  let scrapeService: ScrapeService;
  let transferService: TransferOrderService;
  let shipService: ShipInventoryOrderService;
  let receiveService: ReceiveInventoryOrderService;
  let stockService: StockService;
  let batchService: BatchService;
  let schema: GraphQLSchema;
  let loaderService: LoaderService;

  const execute = async (
    source: string,
  ): Promise<ExecutionResult<Record<string, unknown>>> =>
    graphql({
      schema,
      source,
      contextValue: { ...createWmsLoaders(loaderService) },
    }) as Promise<ExecutionResult<Record<string, unknown>>>;

  let materialId: string;
  let batchId: string;
  let aisleId: string;
  let shelfId: string;
  /** A root location outside every count's scope, with its own material. */
  let outsideId: string;
  let outsideMaterialId: string;
  let outsideBatchId: string;

  /**
   * Put `quantity` of a material somewhere, the way a service would — but with
   * no change row, so nothing the lock watches ever sees it. That is the point
   * for the settlement guard test: it is the one write the lock cannot refuse.
   */
  const seedStock = async (
    quantity: number,
    position: {
      materialId?: string;
      batchId?: string;
      locationId?: string;
    } = {},
  ): Promise<void> => {
    const orderRepository = dataSource.getRepository<OrderEntity>(
      entities.order,
    );
    const baseOrder = await orderRepository.save(orderRepository.create({}));

    await dataSource.getRepository<StockEntityClass>(entities.stock).save({
      orderId: baseOrder.id,
      materialId: position.materialId ?? materialId,
      batchId: position.batchId ?? batchId,
      locationId: position.locationId ?? shelfId,
      loaderId: stockService.resolveLoaderId(null),
      quantity,
    } as never);
  };

  const stockOfAt = async (where: {
    materialId: string;
    locationId: string;
  }): Promise<number> => {
    const { total } = (await dataSource
      .getRepository<StockEntityClass>(entities.stock)
      .createQueryBuilder('stock')
      .select('COALESCE(SUM(stock.quantity), 0)', 'total')
      .where('stock.materialId = :materialId', {
        materialId: where.materialId,
      })
      .andWhere('stock.locationId = :locationId', {
        locationId: where.locationId,
      })
      .getRawOne<{ total: string }>()) ?? { total: '0' };

    return Number(total);
  };

  const stockAt = async (
    where: { materialId: string; batchId?: string } = { materialId },
  ): Promise<number> => {
    const { total } = (await dataSource
      .getRepository<StockEntityClass>(entities.stock)
      .createQueryBuilder('stock')
      .select('COALESCE(SUM(stock.quantity), 0)', 'total')
      .where('stock.materialId = :materialId', {
        materialId: where.materialId,
      })
      .andWhere(
        where.batchId ? 'stock.batchId = :batchId' : '1 = 1',
        where.batchId ? { batchId: where.batchId } : {},
      )
      .getRawOne<{ total: string }>()) ?? { total: '0' };

    return Number(total);
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
    countService = app.get(InventoryCountOrderService);
    scrapeService = app.get(ScrapeService);
    transferService = app.get(TransferOrderService);
    shipService = app.get(ShipInventoryOrderService);
    receiveService = app.get(ReceiveInventoryOrderService);
    stockService = app.get(StockService);
    batchService = app.get(BatchService);
    schema = app.get(GraphQLSchemaHost).schema;
    loaderService = app.get(LoaderService);

    const locationRepository = dataSource.getRepository<LocationEntityClass>(
      entities.location,
    );

    const aisle = await locationRepository.save(
      locationRepository.create({
        key: 'COUNT-AISLE',
        description: 'aisle',
        isActive: true,
      } as DeepPartial<LocationEntityClass>),
    );

    aisleId = aisle.id;

    const shelf = await locationRepository.save(
      locationRepository.create({
        key: 'COUNT-SHELF',
        description: 'shelf',
        isActive: true,
        parent: aisle,
      } as DeepPartial<LocationEntityClass>),
    );

    shelfId = shelf.id;

    const materialRepository = dataSource.getRepository<MaterialEntityClass>(
      entities.material,
    );
    const material = await materialRepository.save(
      materialRepository.create({
        key: 'COUNT-MATERIAL',
      } as DeepPartial<MaterialEntityClass>),
    );

    materialId = material.id;

    const batch = await batchService.getBatch({
      key: 'COUNT-BATCH',
      materialId,
    });

    batchId = batch.id;

    await seedStock(100);

    // Stock that lives outside every count's scope, so a transfer can be
    // pointed *at* a locked shelf from somewhere the lock has no say over.
    const outside = await locationRepository.save(
      locationRepository.create({
        key: 'COUNT-OUTSIDE',
        description: 'outside',
        isActive: true,
      } as DeepPartial<LocationEntityClass>),
    );

    outsideId = outside.id;

    const outsideMaterial = await materialRepository.save(
      materialRepository.create({
        key: 'COUNT-OUTSIDE-MATERIAL',
      } as DeepPartial<MaterialEntityClass>),
    );

    outsideMaterialId = outsideMaterial.id;

    outsideBatchId = (
      await batchService.getBatch({
        key: 'COUNT-OUTSIDE-BATCH',
        materialId: outsideMaterialId,
      })
    ).id;

    await seedStock(10, {
      materialId: outsideMaterialId,
      batchId: outsideBatchId,
      locationId: outsideId,
    });
  });

  // A count left in PENDING or COUNTING locks its locations, so one failing test
  // would otherwise cascade into every later one. Cleaning up after each test
  // keeps the suite order-independent.
  afterEach(async () => {
    const stragglers: { id: string }[] = await dataSource.query(
      `SELECT id FROM ${t('inventory_count_orders')} WHERE status IN ('PENDING', 'COUNTING')`,
    );

    for (const { id } of stragglers) {
      await countService.cancel(id);
    }
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('scope', () => {
    it('expands a chosen location into its descendants', async () => {
      const order = await countService.create({
        name: 'scope check',
        countDate: '2026-01-31',
        locationIds: [aisleId],
      });

      const scope: { locationId: string; isRoot: boolean }[] =
        await dataSource.query(
          `SELECT "locationId", "isRoot" FROM ${t('inventory_count_order_locations')} WHERE "orderId" = $1`,
          [order.id],
        );

      expect(scope.map(({ locationId }) => locationId).sort()).toEqual(
        [aisleId, shelfId].sort(),
      );
      // Only the picked location is a root; the shelf came from the expansion.
      expect(
        scope.find(({ locationId }) => locationId === shelfId)?.isRoot,
      ).toBe(false);

      await countService.cancel(order.id);
    });

    it('derives one sheet line per stocked position in scope', async () => {
      const order = await countService.create({
        name: 'sheet check',
        countDate: '2026-01-31',
        locationIds: [aisleId],
      });

      const items = await dataSource.query(
        `SELECT "materialId", "bookQuantity", "isAddition" FROM ${t('inventory_count_order_items')} WHERE "orderId" = $1`,
        [order.id],
      );

      expect(items).toHaveLength(1);
      expect(items[0].materialId).toBe(materialId);
      expect(Number(items[0].bookQuantity)).toBe(100);
      expect(items[0].isAddition).toBe(false);

      await countService.cancel(order.id);
    });

    it('refuses an order with no locations', async () => {
      await expect(
        countService.create({
          name: 'empty',
          countDate: '2026-01-31',
          locationIds: [],
        }),
      ).rejects.toThrow(/at least one location/);
    });
  });

  describe('listing', () => {
    // `findMany` is the only path that builds raw SQL fragments by hand, and it
    // is what the list page calls on every page load. Its first version aliased
    // the table `order` — a PostgreSQL reserved word — and every query failed
    // with a syntax error that no amount of typechecking would have caught.
    it('lists orders and filters by name, status and scope', async () => {
      const order = await countService.create({
        name: 'listing check',
        countDate: '2026-03-01',
        locationIds: [aisleId],
      });

      const [all, total] = await countService.findMany({ limit: 50 });

      expect(total).toBeGreaterThan(0);
      expect(all.some(({ id }) => id === order.id)).toBe(true);

      const [byName] = await countService.findMany({ name: 'listing' });

      expect(byName.map(({ id }) => id)).toEqual([order.id]);

      const [byStatus] = await countService.findMany({
        statuses: [InventoryCountStatus.PENDING],
        name: 'listing',
      });

      expect(byStatus.map(({ id }) => id)).toEqual([order.id]);

      // The scope filter matches the *expanded* set, so filtering by the shelf
      // finds the count that was created against the whole aisle.
      const [byScope] = await countService.findMany({
        locationIds: [shelfId],
        name: 'listing',
      });

      expect(byScope.map(({ id }) => id)).toEqual([order.id]);

      const [byDate] = await countService.findMany({
        countDateFrom: '2026-03-01',
        countDateTo: '2026-03-01',
      });

      expect(byDate.map(({ id }) => id)).toEqual([order.id]);

      await countService.cancel(order.id);
    });
  });

  describe('through the GraphQL schema', () => {
    // The service-level suites never touch a resolver, which is how a broken
    // `locations` field resolver shipped: it returned the join rows' unloaded
    // `location` relation, so the non-nullable list failed with "Cannot return
    // null for non-nullable field" on every list query. Exercising the schema is
    // the only thing that catches that class of mistake.
    it('serves the list and detail queries end to end', async () => {
      const order = await countService.create({
        name: 'graphql check',
        countDate: '2026-04-01',
        locationIds: [aisleId],
      });

      const list = await execute(`{
        inventoryCountOrders(limit: 10) {
          total
          items { id key name countDate status locations { id key } }
        }
      }`);

      expect(list.errors).toBeUndefined();

      const orders = (
        list.data?.['inventoryCountOrders'] as {
          items: { id: string; locations: { id: string }[] }[];
        }
      ).items;
      const listed = orders.find(({ id }) => id === order.id);

      expect(listed).toBeDefined();
      // Only the picked root, not the expanded subtree.
      expect(listed?.locations.map(({ id }) => id)).toEqual([aisleId]);

      const detail = await execute(`{
        inventoryCountOrder(id: "${order.id}") {
          id
          status
          locations { id key }
          items {
            id
            bookQuantity
            countedQuantity
            isAddition
            material { key }
            batch { key }
            location { key }
          }
        }
      }`);

      expect(detail.errors).toBeUndefined();

      const detailOrder = detail.data?.['inventoryCountOrder'] as {
        items: { bookQuantity: number; material: { key: string } }[];
      };

      expect(detailOrder.items.length).toBeGreaterThan(0);
      expect(detailOrder.items[0].material.key).toBe('COUNT-MATERIAL');

      await countService.cancel(order.id);
    });

    it('records who opened the count', async () => {
      // The list filters by `createdBy` and shows it as 建立者, so the create
      // mutation has to be able to set it — the other order families' create
      // mutations take it the same way.
      const created = await execute(`mutation {
        createInventoryCountOrder(
          name: "creator check"
          countDate: "2026-04-02"
          locationIds: ["${aisleId}"]
          createdBy: "Mark Wu"
        ) { id createdBy }
      }`);

      expect(created.errors).toBeUndefined();

      const order = created.data?.['createInventoryCountOrder'] as {
        id: string;
        createdBy: string | null;
      };

      expect(order.createdBy).toBe('Mark Wu');

      const [byCreator] = await countService.findMany({ createdBy: 'Mark Wu' });

      expect(byCreator.map(({ id }) => id)).toEqual([order.id]);

      await countService.cancel(order.id);
    });
  });

  describe('the count sheet query', () => {
    it('filters by key, by snapshot and by variance, and paginates', async () => {
      const order = await countService.create({
        name: 'sheet query',
        countDate: '2026-06-01',
        locationIds: [aisleId],
      });

      await countService.start(order.id);

      const [all, total] = await countService.findItems(order.id);

      expect(total).toBeGreaterThan(0);
      expect(all.length).toBe(total);

      // Keys are matched case-insensitively on a substring, because that is how
      // the operator types them.
      const [byMaterial] = await countService.findItems(order.id, {
        materialKey: 'count-mat',
      });

      expect(byMaterial.length).toBe(total);

      const [byMissing] = await countService.findItems(order.id, {
        materialKey: 'NOTHING-MATCHES',
      });

      expect(byMissing).toEqual([]);

      const [byLocation] = await countService.findItems(order.id, {
        locationKey: 'COUNT-SHELF',
      });

      expect(byLocation.length).toBe(total);

      // Nothing counted yet, so nothing has a variance.
      const [noVariance] = await countService.findItems(order.id, {
        onlyVariance: true,
      });

      expect(noVariance).toEqual([]);

      const target = all[0];

      await countService.count(order.id, [
        { itemId: target.id, countedQuantity: Number(target.bookQuantity) },
      ]);

      // Counted, but matching the books — still not a variance.
      const [stillNone] = await countService.findItems(order.id, {
        onlyVariance: true,
      });

      expect(stillNone).toEqual([]);

      await countService.count(order.id, [
        { itemId: target.id, countedQuantity: Number(target.bookQuantity) - 1 },
      ]);

      const [withVariance] = await countService.findItems(order.id, {
        onlyVariance: true,
      });

      expect(withVariance.map(({ id }) => id)).toEqual([target.id]);

      const [firstPage, pagedTotal] = await countService.findItems(order.id, {
        limit: 1,
        offset: 0,
      });

      expect(firstPage).toHaveLength(1);
      expect(pagedTotal).toBe(total);

      await countService.cancel(order.id);
    });

    it('serves the sheet through the schema', async () => {
      const order = await countService.create({
        name: 'sheet query graphql',
        countDate: '2026-06-02',
        locationIds: [aisleId],
      });

      await countService.start(order.id);

      const result = await execute(`{
        inventoryCountOrderItems(id: "${order.id}", limit: 10, materialKey: "COUNT") {
          total
          items {
            id
            bookQuantity
            held
            inspectionResult
            vendorId
            saleSerialId
            material { key }
            location { key }
          }
        }
      }`);

      expect(result.errors).toBeUndefined();

      const page = result.data?.['inventoryCountOrderItems'] as {
        total: number;
        items: { material: { key: string } }[];
      };

      expect(page.total).toBeGreaterThan(0);
      expect(page.items[0].material.key).toBe('COUNT-MATERIAL');

      await countService.cancel(order.id);
    });
  });

  describe('batch attribute snapshots', () => {
    // The sheet shows whether a position was awaiting inspection, held or in
    // transfer, and which vendor / customer / sale order it belonged to. Those
    // live on the batch and keep moving after the count settles, so they are
    // copied onto the line when counting starts — a June count has to keep
    // showing June.
    it('copies the batch attributes onto the line when counting starts', async () => {
      const batchRepository = dataSource.getRepository(entities.batch);

      await batchRepository.update({ id: batchId }, {
        held: true,
        inspectionResult: null,
        vendorId: 'VENDOR-1',
        saleId: 'SO-1',
        saleSerialId: '001',
      } as never);

      const order = await countService.create({
        name: 'snapshot check',
        countDate: '2026-05-01',
        locationIds: [aisleId],
      });

      await countService.start(order.id);

      const [line] = await dataSource.query(
        `SELECT held, "inspectionResult", "vendorId", "saleId", "saleSerialId"
           FROM ${t('inventory_count_order_items')}
          WHERE "orderId" = $1 AND "batchId" = $2`,
        [order.id, batchId],
      );

      expect(line.held).toBe(true);
      expect(line.inspectionResult).toBeNull();
      expect(line.vendorId).toBe('VENDOR-1');
      expect(line.saleId).toBe('SO-1');
      expect(line.saleSerialId).toBe('001');

      // Now the batch moves on. The settled sheet must not follow it.
      await batchRepository.update({ id: batchId }, {
        held: false,
        vendorId: null,
        saleId: null,
        saleSerialId: null,
      } as never);

      const [afterwards] = await dataSource.query(
        `SELECT held, "vendorId" FROM ${t('inventory_count_order_items')}
          WHERE "orderId" = $1 AND "batchId" = $2`,
        [order.id, batchId],
      );

      expect(afterwards.held).toBe(true);
      expect(afterwards.vendorId).toBe('VENDOR-1');

      await countService.cancel(order.id);
    });

    it('snapshots an added line from its own batch', async () => {
      const order = await countService.create({
        name: 'addition snapshot',
        countDate: '2026-05-02',
        locationIds: [aisleId],
      });

      await countService.start(order.id);

      const item = await countService.addItem(order.id, {
        materialId,
        batchKey: 'SNAPSHOT-NEW-BATCH',
        locationId: shelfId,
        countedQuantity: 3,
      });

      // Unbooked stock in a brand-new batch: not held, not in transfer, and
      // uninspected — the defaults, which is what the sheet should show.
      expect(item.held).toBe(false);
      expect(item.inShipment).toBe(false);
      expect(item.requiresInspection).toBe(false);
      expect(item.transferId).toBeNull();
      expect(item.vendorId).toBeNull();

      await countService.cancel(order.id);
    });

    it('refuses a second line for a position the sheet already has', async () => {
      const order = await countService.create({
        name: 'duplicate addition',
        countDate: '2026-05-03',
        locationIds: [aisleId],
      });

      await countService.start(order.id);

      // The shelf's existing batch is already a scoped line; adding it again
      // would make settlement adjust the same stock twice. A missing loader
      // resolves to the default one, which is where the scoped line sits.
      await expect(
        countService.addItem(order.id, {
          materialId,
          batchKey: 'COUNT-BATCH',
          locationId: shelfId,
          countedQuantity: 1,
        }),
      ).rejects.toThrow(/already has a line/);

      await countService.cancel(order.id);
    });
  });

  describe('locking', () => {
    it('blocks a stock movement in scope while counting, naming the order', async () => {
      const order = await countService.create({
        name: 'lock check',
        countDate: '2026-01-31',
        locationIds: [aisleId],
      });

      await countService.start(order.id);

      // Called straight through the service, bypassing every resolver — this is
      // the path a host with its own inbound flow uses, and the one the lock has
      // to cover.
      await expect(
        scrapeService.scrape([
          {
            materialId,
            batchId,
            locationId: shelfId,
            loaderId: null,
            unitId: null,
            quantity: 1,
          } as never,
        ]),
      ).rejects.toThrow(new RegExp(order.key));

      expect(await stockAt()).toBe(100);

      await countService.cancel(order.id);
    });

    it('releases the lock when the count is cancelled', async () => {
      // The previous test cancelled its order; the same movement must now pass.
      await scrapeService.scrape([
        {
          materialId,
          batchId,
          locationId: shelfId,
          loaderId: null,
          unitId: null,
          quantity: 1,
        } as never,
      ]);

      expect(await stockAt()).toBe(99);

      await seedStock(1);

      expect(await stockAt()).toBe(100);
    });

    it('refuses a transfer into a locked location', async () => {
      const order = await countService.create({
        name: 'inbound transfer check',
        countDate: '2026-01-31',
        locationIds: [aisleId],
      });

      await countService.start(order.id);

      // The source is outside the scope, so only the destination is locked.
      // Reserving the transfer already writes a change row, and completing it
      // would put stock on the counted shelf — both have to be refused.
      const transferIn = () =>
        transferService.createTransferOrder({
          locationId: shelfId,
          items: [
            {
              materialId: outsideMaterialId,
              batchId: outsideBatchId,
              locationId: outsideId,
              targetTransferredQuantity: 1,
            },
          ],
        } as never);

      await expect(transferIn()).rejects.toThrow(new RegExp(order.key));

      expect(
        await stockOfAt({ materialId: outsideMaterialId, locationId: shelfId }),
      ).toBe(0);

      await countService.cancel(order.id);

      // Lock gone: the same transfer reserves and completes.
      const transfer = await transferIn();
      const [item] = await dataSource.query(
        `SELECT id FROM ${t('transfer_order_items')} WHERE "orderId" = $1`,
        [transfer.id],
      );

      await transferService.transfer({ itemId: item.id, quantity: 1 });

      expect(
        await stockOfAt({ materialId: outsideMaterialId, locationId: shelfId }),
      ).toBe(1);

      // Put it back. The suites below read the shelf's sheet by position and
      // assume the seeded material is the only thing on it.
      const transferOut = await transferService.createTransferOrder({
        locationId: outsideId,
        items: [
          {
            materialId: outsideMaterialId,
            batchId: outsideBatchId,
            locationId: shelfId,
            targetTransferredQuantity: 1,
          },
        ],
      } as never);
      const [outItem] = await dataSource.query(
        `SELECT id FROM ${t('transfer_order_items')} WHERE "orderId" = $1`,
        [transferOut.id],
      );

      await transferService.transfer({ itemId: outItem.id, quantity: 1 });

      expect(
        await stockOfAt({ materialId: outsideMaterialId, locationId: shelfId }),
      ).toBe(0);
    });

    it('refuses to settle when the ledger moved around the lock', async () => {
      const order = await countService.create({
        name: 'moved ledger',
        countDate: '2026-01-31',
        locationIds: [aisleId],
      });

      await countService.start(order.id);

      const [item] = await dataSource.query(
        `SELECT id, "bookQuantity" FROM ${t('inventory_count_order_items')} WHERE "orderId" = $1 AND "batchId" = $2`,
        [order.id, batchId],
      );

      await countService.count(order.id, [
        { itemId: item.id, countedQuantity: Number(item.bookQuantity) - 1 },
      ]);

      // A bare `stocks` insert never touches a change row, so the lock cannot
      // see it. Settlement has to notice the books moved rather than post a
      // variance against a snapshot that no longer describes the shelf.
      await seedStock(1);

      await expect(countService.settle(order.id)).rejects.toThrow(/moved/);

      await seedStock(-1);
      await countService.cancel(order.id);

      expect(await stockAt()).toBe(100);
    });
  });

  describe('transactions', () => {
    it('leaves nothing behind when creating a count fails halfway', async () => {
      // The header saves first and the sheet is built afterwards; without a
      // transaction a rebuild that throws would strand a PENDING order with
      // no lines, which the list would happily show.
      const spy = jest
        .spyOn(countService as never, 'rebuildItems' as never)
        .mockRejectedValueOnce(new Error('sheet build failed') as never);

      await expect(
        countService.create({
          name: 'half-created',
          countDate: '2026-07-01',
          locationIds: [aisleId],
        }),
      ).rejects.toThrow(/sheet build failed/);

      spy.mockRestore();

      const [orphans] = await countService.findMany({ name: 'half-created' });

      expect(orphans).toEqual([]);
    });
  });

  describe('settlement', () => {
    it('writes the shortage and completes the order', async () => {
      const order = await countService.create({
        name: 'shortage',
        countDate: '2026-02-01',
        locationIds: [aisleId],
      });

      await countService.start(order.id);

      const [item] = await dataSource.query(
        `SELECT id FROM ${t('inventory_count_order_items')} WHERE "orderId" = $1`,
        [order.id],
      );

      // 100 on the books, 94 on the shelf.
      await countService.count(order.id, [
        { itemId: item.id, countedQuantity: 94 },
      ]);

      // Nothing moves before settlement — the count is working notes.
      expect(await stockAt()).toBe(100);

      const settled = await countService.settle(order.id);

      expect(settled.status).toBe(InventoryCountStatus.COMPLETED);
      expect(settled.settledAt).toBeInstanceOf(Date);
      expect(await stockAt()).toBe(94);

      const [change] = await dataSource.query(
        `SELECT c."quantityChanged"
           FROM ${t('inventory_count_order_changes')} c
           JOIN ${t('inventory_count_order_items')} i ON i.id = c."itemId"
          WHERE i."orderId" = $1`,
        [order.id],
      );

      expect(Number(change.quantityChanged)).toBe(-6);
    });

    it('leaves uncounted lines alone rather than zeroing them', async () => {
      const order = await countService.create({
        name: 'uncounted',
        countDate: '2026-02-02',
        locationIds: [aisleId],
      });

      await countService.start(order.id);
      await countService.settle(order.id);

      // "not counted" is not "counted as zero" — treating it as zero would wipe
      // out stock nobody even looked at.
      expect(await stockAt()).toBe(94);
    });

    it('books a surplus for stock the ledger never had, creating the batch', async () => {
      const order = await countService.create({
        name: 'surplus',
        countDate: '2026-02-03',
        locationIds: [aisleId],
      });

      await countService.start(order.id);

      await countService.addItem(order.id, {
        materialId,
        batchKey: 'COUNT-BATCH-NEW',
        locationId: shelfId,
        countedQuantity: 7,
      });

      await countService.settle(order.id);

      const created = await dataSource
        .getRepository(entities.batch)
        .findOneBy({ key: 'COUNT-BATCH-NEW', materialId } as never);

      expect(created).not.toBeNull();
      expect(await stockAt({ materialId, batchId: created!.id })).toBe(7);
      // The pre-existing batch is untouched by the surplus line.
      expect(await stockAt({ materialId, batchId })).toBe(94);
    });

    it('refuses an added line outside the counted scope', async () => {
      const order = await countService.create({
        name: 'out of scope',
        countDate: '2026-02-04',
        locationIds: [aisleId],
      });

      await countService.start(order.id);

      await expect(
        countService.addItem(order.id, {
          materialId,
          batchKey: 'COUNT-BATCH',
          locationId: stockService.defaultLocationId,
          countedQuantity: 1,
        }),
      ).rejects.toThrow(/outside the scope/);

      await countService.cancel(order.id);
    });
  });

  describe('status guards', () => {
    it('rejects counting before the count has started', async () => {
      const order = await countService.create({
        name: 'guard',
        countDate: '2026-02-05',
        locationIds: [aisleId],
      });

      const [item] = await dataSource.query(
        `SELECT id FROM ${t('inventory_count_order_items')} WHERE "orderId" = $1`,
        [order.id],
      );

      await expect(
        countService.count(order.id, [{ itemId: item.id, countedQuantity: 1 }]),
      ).rejects.toThrow(/requires COUNTING/);

      await countService.cancel(order.id);
    });

    it('clears counting and additions on reset, keeping the count open', async () => {
      const order = await countService.create({
        name: 'reset',
        countDate: '2026-02-06',
        locationIds: [aisleId],
      });

      await countService.start(order.id);

      const [item] = await dataSource.query(
        `SELECT id FROM ${t('inventory_count_order_items')} WHERE "orderId" = $1`,
        [order.id],
      );

      await countService.count(order.id, [
        { itemId: item.id, countedQuantity: 3 },
      ]);
      await countService.addItem(order.id, {
        materialId,
        batchKey: 'COUNT-BATCH-RESET',
        locationId: shelfId,
        countedQuantity: 2,
      });

      const reset = await countService.reset(order.id);

      // Still counting: a re-measure is not an abandonment, and the lock stays.
      expect(reset.status).toBe(InventoryCountStatus.COUNTING);

      const rows = await dataSource.query(
        `SELECT "countedQuantity", "isAddition" FROM ${t('inventory_count_order_items')} WHERE "orderId" = $1`,
        [order.id],
      );

      // The surplus line is gone and every remaining line is uncounted again.
      // (How many scoped lines there are depends on what earlier tests booked
      // onto the shelf, so assert the property rather than a count.)
      expect(
        rows.filter((row: { isAddition: boolean }) => row.isAddition),
      ).toEqual([]);
      expect(rows.length).toBeGreaterThan(0);
      expect(
        rows.every(
          (row: { countedQuantity: string | null }) =>
            row.countedQuantity === null,
        ),
      ).toBe(true);

      await countService.cancel(order.id);
    });
  });

  /**
   * `lockLocations: false` -- the count that runs while the warehouse keeps
   * moving. Its own location tree and one material per test, so nothing here
   * lands on the shelf the suites above read by position.
   */
  describe('counting without locking the locations', () => {
    let freeAisleId: string;
    let freeShelfId: string;
    let freeDockId: string;
    let seq = 0;

    const sumText = async (material: string): Promise<string> => {
      const [row] = await dataSource.query(
        `SELECT COALESCE(SUM(quantity), 0)::text AS total FROM ${t('stocks')} WHERE "materialId" = $1`,
        [material],
      );

      return row.total;
    };

    const stockedMaterial = async (
      quantity: number,
    ): Promise<{
      materialId: string;
      materialKey: string;
      batchId: string;
      batchKey: string;
    }> => {
      seq += 1;

      const materialRepository = dataSource.getRepository<MaterialEntityClass>(
        entities.material,
      );
      const material = await materialRepository.save(
        materialRepository.create({
          key: `FREE-MATERIAL-${seq}`,
        } as DeepPartial<MaterialEntityClass>),
      );
      const batchKey = `FREE-BATCH-${seq}`;
      const batch = await batchService.getBatch({
        key: batchKey,
        materialId: material.id,
      });

      await seedStock(quantity, {
        materialId: material.id,
        batchId: batch.id,
        locationId: freeShelfId,
      });

      return {
        materialId: material.id,
        materialKey: material.key,
        batchId: batch.id,
        batchKey,
      };
    };

    const shipLine = async (
      materialId: string,
      batchId: string,
      quantity: number,
    ): Promise<string> =>
      dataSource.transaction(async (manager) => {
        seq += 1;

        const order = await shipService.createShipInventoryOrder({
          key: `FREE-SHIP-${seq}`,
          description: 'shipped during a count',
          references: [],
          manager,
        });

        await shipService.addShipInventoryOrderItems(
          {
            orderId: order.id,
            items: [
              {
                materialId,
                batchId,
                locationId: freeShelfId,
                targetShippedQuantity: quantity,
                status: StockStatus.FREE,
                serialId: `FREE-SHIP-LINE-${seq}`,
                orderId: order.id,
              },
            ],
          },
          manager,
        );

        const [item] = await manager.query(
          `SELECT id FROM ${t('ship_inventory_order_items')} WHERE "orderId" = $1`,
          [order.id],
        );

        return item.id as string;
      });

    const itemOf = async (
      orderId: string,
      materialId: string,
    ): Promise<{ id: string }> => {
      const [item] = await dataSource.query(
        `SELECT id FROM ${t('inventory_count_order_items')} WHERE "orderId" = $1 AND "materialId" = $2 AND "isAddition" = false`,
        [orderId, materialId],
      );

      return item;
    };

    const createFree = async (name: string, lockLocations: boolean) =>
      countService.create({
        name,
        countDate: '2026-11-23',
        locationIds: [freeAisleId],
        lockLocations,
      });

    beforeAll(async () => {
      const locationRepository = dataSource.getRepository<LocationEntityClass>(
        entities.location,
      );
      const aisle = await locationRepository.save(
        locationRepository.create({
          key: 'FREE-AISLE',
          description: 'aisle',
          isActive: true,
        } as DeepPartial<LocationEntityClass>),
      );
      const shelf = await locationRepository.save(
        locationRepository.create({
          key: 'FREE-SHELF',
          description: 'shelf',
          isActive: true,
          parent: aisle,
        } as DeepPartial<LocationEntityClass>),
      );
      const dock = await locationRepository.save(
        locationRepository.create({
          key: 'FREE-DOCK',
          description: 'dock',
          isActive: true,
        } as DeepPartial<LocationEntityClass>),
      );

      freeAisleId = aisle.id;
      freeShelfId = shelf.id;
      freeDockId = dock.id;
    });

    it('locks by default, and says so on the order', async () => {
      const order = await countService.create({
        name: 'default lock',
        countDate: '2026-11-23',
        locationIds: [freeAisleId],
      });

      expect(order.lockLocations).toBe(true);

      const { materialId: lockedMaterial, batchId: lockedBatch } =
        await stockedMaterial(5);

      await countService.start(order.id);

      await expect(
        scrapeService.scrape([
          {
            materialId: lockedMaterial,
            batchId: lockedBatch,
            locationId: freeShelfId,
            loaderId: null,
            unitId: null,
            quantity: 1,
          } as never,
        ]),
      ).rejects.toThrow(new RegExp(order.key));

      await countService.cancel(order.id);
    });

    it('lets shipping, receiving and transferring carry on while counting', async () => {
      const stocked = await stockedMaterial(20);
      const order = await createFree('unlocked movements', false);

      expect(order.lockLocations).toBe(false);

      await countService.start(order.id);

      // The reproduction from #226: each of these is refused while the
      // locations are locked.
      const itemId = await shipLine(stocked.materialId, stocked.batchId, 1);

      await shipService.ship({ itemId, quantity: 1 });

      const receive = await receiveService.createReceiveInventoryOrder({
        key: `FREE-RCV-${(seq += 1)}`,
        description: 'received during a count',
        items: [
          {
            serialId: `FREE-RCV-LINE-${seq}`,
            materialKey: stocked.materialKey,
            batchKey: `FREE-RCV-BATCH-${seq}`,
            locationKey: 'FREE-SHELF',
            targetReceivedQuantity: 4,
            requireInspection: false,
          },
        ],
      });
      const [receiveItem] = await dataSource.query(
        `SELECT id FROM ${t('receive_inventory_order_items')} WHERE "orderId" = $1`,
        [receive.id],
      );

      await receiveService.receive({ itemId: receiveItem.id, quantity: 4 });

      const transfer = await transferService.createTransferOrder({
        locationId: freeDockId,
        items: [
          {
            materialId: stocked.materialId,
            batchId: stocked.batchId,
            locationId: freeShelfId,
            targetTransferredQuantity: 2,
          },
        ],
      } as never);
      const [transferItem] = await dataSource.query(
        `SELECT id FROM ${t('transfer_order_items')} WHERE "orderId" = $1`,
        [transfer.id],
      );

      await transferService.transfer({
        itemId: transferItem.id,
        quantity: 2,
      });

      // 20 - 1 shipped + 4 received (another batch); the transfer nets to 0.
      expect(await sumText(stocked.materialId)).toBe('23');

      await countService.cancel(order.id);
    });

    it('settles counted minus snapshot on top of what moved meanwhile', async () => {
      const stocked = await stockedMaterial(10);
      const order = await createFree('unlocked settle', false);

      await countService.start(order.id);

      // 3 leave during the count: the ledger is 7 while the snapshot says 10.
      const itemId = await shipLine(stocked.materialId, stocked.batchId, 3);

      await shipService.ship({ itemId, quantity: 3 });

      expect(await sumText(stocked.materialId)).toBe('7');

      // The counter reaches the shelf afterwards and finds 9: 1 short of the
      // 10 the sheet expected, whatever the books say now.
      const line = await itemOf(order.id, stocked.materialId);

      await countService.count(order.id, [
        { itemId: line.id, countedQuantity: 9 },
      ]);

      const settled = await countService.settle(order.id);

      expect(settled.status).toBe(InventoryCountStatus.COMPLETED);

      // -1, not -(7 - 9) = +2 and not "set the shelf to 9": the shipment is
      // already in the ledger, so only the miscount may be posted. 7 - 1 = 6.
      const [change] = await dataSource.query(
        `SELECT "quantityChanged" FROM ${t('inventory_count_order_changes')} WHERE "itemId" = $1`,
        [line.id],
      );

      expect(Number(change.quantityChanged)).toBe(-1);
      expect(await sumText(stocked.materialId)).toBe('6');

      // The snapshot and the count stay on the sheet for the ERP to read.
      const [kept] = await dataSource.query(
        `SELECT "bookQuantity"::text AS book, "countedQuantity"::text AS counted FROM ${t('inventory_count_order_items')} WHERE id = $1`,
        [line.id],
      );

      expect(kept).toEqual({ book: '10', counted: '9' });
    });

    it('keeps 0.1-grain differences exact', async () => {
      const stocked = await stockedMaterial(0.5);
      const order = await createFree('unlocked grain', false);

      await countService.start(order.id);

      const itemId = await shipLine(stocked.materialId, stocked.batchId, 0.2);

      await shipService.ship({ itemId, quantity: 0.2 });

      const line = await itemOf(order.id, stocked.materialId);

      // 0.4 - 0.5 is -0.09999999999999998 in floats.
      await countService.count(order.id, [
        { itemId: line.id, countedQuantity: 0.4 },
      ]);
      await countService.settle(order.id);

      const [change] = await dataSource.query(
        `SELECT "quantityChanged"::text AS delta FROM ${t('inventory_count_order_changes')} WHERE "itemId" = $1`,
        [line.id],
      );

      expect(change.delta).toBe('-0.1');
      expect(await sumText(stocked.materialId)).toBe('0.2');
    });

    it('does not refuse to settle when the ledger moved', async () => {
      const stocked = await stockedMaterial(10);
      const order = await createFree('unlocked drift', false);

      await countService.start(order.id);
      await seedStock(1, {
        materialId: stocked.materialId,
        batchId: stocked.batchId,
        locationId: freeShelfId,
      });

      const line = await itemOf(order.id, stocked.materialId);

      await countService.count(order.id, [
        { itemId: line.id, countedQuantity: 10 },
      ]);

      // The locked mode refuses this ("moved"); here the movement is expected.
      await expect(countService.settle(order.id)).resolves.toMatchObject({
        status: InventoryCountStatus.COMPLETED,
      });
      expect(await sumText(stocked.materialId)).toBe('11');
    });

    it('takes the stock locks before it writes, in both modes', async () => {
      const spy = jest.spyOn(stockService, 'lockStockSlots');

      for (const lockLocations of [true, false]) {
        const stocked = await stockedMaterial(5);
        const order = await createFree(`slots ${lockLocations}`, lockLocations);

        await countService.start(order.id);

        const line = await itemOf(order.id, stocked.materialId);

        await countService.count(order.id, [
          { itemId: line.id, countedQuantity: 4 },
        ]);

        spy.mockClear();
        await countService.settle(order.id);

        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy.mock.calls[0][0]).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              materialId: stocked.materialId,
              batchId: stocked.batchId,
            }),
          ]),
        );
      }

      spy.mockRestore();
    });

    it('waits for a shipment that holds the stock slot', async () => {
      const stocked = await stockedMaterial(10);
      const order = await createFree('unlocked race', false);

      await countService.start(order.id);

      const line = await itemOf(order.id, stocked.materialId);

      await countService.count(order.id, [
        { itemId: line.id, countedQuantity: 10 },
      ]);

      let release: () => void = () => undefined;
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      let acquired: () => void = () => undefined;
      const lockTaken = new Promise<void>((resolve) => {
        acquired = resolve;
      });

      // Another transaction in the middle of a deduction: it owns the slot.
      const other = dataSource.transaction(async (manager) => {
        await stockService.lockStockSlots(
          [{ materialId: stocked.materialId, batchId: stocked.batchId }],
          manager,
        );
        acquired();
        await held;
      });

      await lockTaken;

      let settled = false;
      const settling = countService.settle(order.id).then(() => {
        settled = true;
      });

      await new Promise((resolve) => setTimeout(resolve, 400));

      expect(settled).toBe(false);

      release();
      await other;
      await settling;

      expect(settled).toBe(true);
    });

    it('fixes the flag once counting has started', async () => {
      const order = await createFree('flag frozen', false);

      // Still pending: the order is editable like any other field.
      const flipped = await countService.update(order.id, {
        lockLocations: true,
      });

      expect(flipped.lockLocations).toBe(true);

      await countService.update(order.id, { lockLocations: false });
      await countService.start(order.id);

      await expect(
        countService.update(order.id, { lockLocations: true }),
      ).rejects.toThrow();

      const [row] = await dataSource.query(
        `SELECT "lockLocations" FROM ${t('inventory_count_orders')} WHERE id = $1`,
        [order.id],
      );

      expect(row.lockLocations).toBe(false);

      await countService.cancel(order.id);
    });

    it('creates the order and serves its sheet through the schema', async () => {
      const stocked = await stockedMaterial(8);
      const created = await execute(`mutation {
        createInventoryCountOrder(
          name: "schema unlocked"
          countDate: "2026-11-23"
          locationIds: ["${freeAisleId}"]
          lockLocations: false
        ) { id lockLocations }
      }`);

      expect(created.errors).toBeUndefined();

      const order = created.data?.['createInventoryCountOrder'] as {
        id: string;
        lockLocations: boolean;
      };

      expect(order.lockLocations).toBe(false);

      await countService.start(order.id);

      const sheet = await execute(`{
        inventoryCountOrderItems(id: "${order.id}") { items { bookQuantity materialId } }
      }`);

      expect(sheet.errors).toBeUndefined();
      expect(JSON.stringify(sheet.data)).toContain(stocked.materialId);

      await countService.cancel(order.id);
    });
  });
});
