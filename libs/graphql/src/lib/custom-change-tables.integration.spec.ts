import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from 'pg';
import {
  Column,
  DataSource,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type DeepPartial,
} from 'typeorm';
import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import {
  BatchService,
  ChangeType,
  InventoryCountOrderService,
  LocationEntityClass,
  MaterialEntityClass,
  StockEntityClass,
  StockService,
  WmsEntities,
  WmsOperationRunner,
  type WmsAfterEventContext,
  type WmsStockEventPayload,
} from '@rytass/wms-module-core';
import { WmsModuleGraphqlModule } from './graphql.module';
import { LoaderService, createWmsLoaders } from './helpers';

/**
 * A host's own order family, registered through `customChangeTables`.
 *
 * The point of the extension point is how *little* it has to do. A host that
 * writes its own order family already inherits the transaction, the
 * availability check, the ledger and the inventory count lock — the lock keys
 * off the `_order_changes` suffix, so it covers a table this package has never
 * heard of. The only thing missing was an event, because the table-to-
 * `ChangeType` map is closed.
 *
 * So these cases pin two things: that the registration produces the event, and
 * that everything else really was already there. The second is the more
 * valuable of the two, because it is the part a host would otherwise
 * reimplement badly.
 *
 * Requires a reachable PostgreSQL; override with WMS_TEST_DB_* env vars.
 */
const DB_HOST = process.env['WMS_TEST_DB_HOST'] ?? 'localhost';
const DB_PORT = Number(process.env['WMS_TEST_DB_PORT'] ?? 5432);
const DB_USER =
  process.env['WMS_TEST_DB_USER'] ?? process.env['USER'] ?? 'postgres';
const DB_PASS = process.env['WMS_TEST_DB_PASS'];
const DB_NAME =
  process.env['WMS_TEST_CUSTOM_CHANGE_DB_NAME'] ??
  'wms_module_custom_change_test';

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

/*
 * The host's own two-table order family. Nothing here imports anything from
 * this package: it is an ordinary TypeORM entity that happens to follow the
 * `*_order_items` / `*_order_changes` naming convention.
 */
@Entity('tenant_rework_order_items')
class ReworkOrderItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  materialId!: string;

  @Column({ type: 'uuid' })
  batchId!: string;

  @Column({ type: 'uuid' })
  locationId!: string;

  @Column({ type: 'uuid', nullable: true })
  loaderId!: string | null;
}

@Entity('tenant_rework_order_changes')
class ReworkOrderChangeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  itemId!: string;

  @Column({ type: 'numeric' })
  quantityChanged!: number;

  /** The host's own vocabulary, which this package knows nothing about. */
  @Column({ type: 'varchar' })
  reworkStage!: string;

  @ManyToOne(() => ReworkOrderItemEntity)
  @JoinColumn({ name: 'itemId', referencedColumnName: 'id' })
  item!: ReworkOrderItemEntity;
}

const stockEvents: {
  event: string;
  changeType: ChangeType | null;
  customChangeType?: string;
}[] = [];

const recordStockEvent = async (
  context: WmsAfterEventContext,
): Promise<void> => {
  const payload = context.payload as WmsStockEventPayload;

  stockEvents.push({
    event: context.event,
    changeType: payload.changeType,
    customChangeType: payload.customChangeType,
  });
};

describe('custom change tables (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let entities: WmsEntities;
  let stockService: StockService;
  let batchService: BatchService;
  let countService: InventoryCountOrderService;
  let runner: WmsOperationRunner;

  let materialId: string;
  let locationId: string;
  let batchId: string;
  let itemId: string;

  const newBaseOrderId = async (): Promise<string> => {
    const repository = dataSource.getRepository<OrderEntity>(entities.order);
    return (await repository.save(repository.create({}))).id;
  };

  /** Write one change row the way the host's own service would. */
  const writeChange = async (
    stage: string,
    quantityChanged: number,
  ): Promise<void> => {
    await runner.run({}, async () => {
      const changeRepository = dataSource.getRepository(
        ReworkOrderChangeEntity,
      );

      await changeRepository.save(
        changeRepository.create({
          id: await newBaseOrderId(),
          itemId,
          quantityChanged,
          reworkStage: stage,
        } as DeepPartial<ReworkOrderChangeEntity>),
      );
    });
  };

  beforeEach(() => {
    stockEvents.length = 0;
  });

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
          entities: [ReworkOrderItemEntity, ReworkOrderChangeEntity],
        }),
        TypeOrmModule.forFeature([
          ReworkOrderItemEntity,
          ReworkOrderChangeEntity,
        ]),
        WmsModuleGraphqlModule.forRootAsync({
          useFactory: async () => ({}),
          defaultLoaderSerialId: 'DEFAULT',
          defaultLoaderTypeKey: 'DEFAULT',
          defaultLocationKey: 'DEFAULT',
          customChangeTables: [
            {
              table: 'tenant_rework_order_changes',
              changeType: (change) => {
                const stage = change['reworkStage'];

                // A stage this package does have a name for: reuse it, so the
                // movement still counts as a scrap in every report.
                if (stage === 'written-off') return ChangeType.SCRAPED;
                // One it does not: the host's own string travels through.
                if (stage === 'reworking') return 'REWORKING';
                // And a row that moves no stock at all.
                return null;
              },
            },
          ],
          afterListeners: {
            'stock.custom': recordStockEvent,
            'stock.scraped': recordStockEvent,
          },
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
    stockService = app.get(StockService);
    batchService = app.get(BatchService);
    countService = app.get(InventoryCountOrderService);
    runner = app.get(WmsOperationRunner);

    const locationRepository = dataSource.getRepository<LocationEntityClass>(
      entities.location,
    );
    locationId = (
      await locationRepository.save(
        locationRepository.create({
          key: 'REWORK-BAY',
          description: 'rework bay',
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
          key: 'REWORK-MATERIAL',
        } as DeepPartial<MaterialEntityClass>),
      )
    ).id;

    batchId = (await batchService.getBatch({ key: 'REWORK-B1', materialId }))
      .id;

    await dataSource.getRepository<StockEntityClass>(entities.stock).save({
      orderId: await newBaseOrderId(),
      materialId,
      batchId,
      locationId,
      loaderId: stockService.resolveLoaderId(null),
      quantity: 50,
    } as never);

    const itemRepository = dataSource.getRepository(ReworkOrderItemEntity);
    itemId = (
      await itemRepository.save(
        itemRepository.create({
          materialId,
          batchId,
          locationId,
          loaderId: stockService.resolveLoaderId(null),
        } as DeepPartial<ReworkOrderItemEntity>),
      )
    ).id;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('emits stock.custom carrying the host’s own change type', async () => {
    await writeChange('reworking', 5);

    expect(stockEvents).toEqual([
      {
        event: 'stock.custom',
        changeType: null,
        customChangeType: 'REWORKING',
      },
    ]);
  });

  it('reuses one of our change types when the host names one', async () => {
    await writeChange('written-off', -3);

    // Not `stock.custom`: the host said this movement is a scrap, so it fires
    // the real event and counts wherever scraps count.
    expect(stockEvents).toEqual([
      {
        event: 'stock.scraped',
        changeType: ChangeType.SCRAPED,
        customChangeType: undefined,
      },
    ]);
  });

  it('emits nothing for a row the host says does not move stock', async () => {
    await writeChange('inspected', 0);

    expect(stockEvents).toEqual([]);
  });

  /*
   * The half a host would otherwise reimplement. Neither of these needed any
   * registration: they follow from the naming convention and from the ledger
   * being ordinary `stocks` rows.
   */
  describe('what a custom family already had', () => {
    it('is covered by the inventory count lock', async () => {
      const order = await countService.create({
        name: 'lock the bay',
        countDate: '2026-09-05',
        locationIds: [locationId],
      });

      await countService.start(order.id);

      try {
        // The subscriber never heard of `tenant_rework_order_changes`; it
        // refuses it because the table name ends in `_order_changes` and the
        // change reaches an order item carrying a locked `locationId`.
        await expect(writeChange('reworking', 1)).rejects.toThrow(
          /locked by inventory count order/,
        );
      } finally {
        // Without this the count stays COUNTING when the assertion fails, and
        // every later test that touches this location fails for a reason that
        // has nothing to do with what it was testing.
        await countService.cancel(order.id);
      }
    });

    it('shares the same stock ledger, so its movements aggregate', async () => {
      await runner.run({}, async () => {
        await dataSource.getRepository<StockEntityClass>(entities.stock).save({
          orderId: await newBaseOrderId(),
          materialId,
          batchId,
          locationId,
          loaderId: stockService.resolveLoaderId(null),
          quantity: -10,
        } as never);
      });

      const [items] = await stockService.findAggregatedStocks({ batchId });

      expect(
        items.reduce((total, item) => total + Number(item.quantity), 0),
      ).toBe(40);
    });

    it('can use the published availability check', async () => {
      await expect(
        stockService.validateStockAvailability({
          materialId,
          batchId,
          locationId,
          loaderId: stockService.resolveLoaderId(null),
          quantity: 999,
        }),
      ).rejects.toThrow('Insufficient stock');
    });
  });
});
