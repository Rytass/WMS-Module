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
  LocationEntityClass,
  MaterialEntityClass,
  ReceiveInventoryOrderItemEntityClass,
  ReceiveInventoryOrderService,
  ShipInventoryOrderItemEntityClass,
  ShipInventoryOrderService,
  StockEntityClass,
  StockService,
  StockStatus,
  TransferOrderItemEntityClass,
  TransferOrderService,
  WmsEntities,
} from '@rytass/wms-module-core';
import { WmsModuleGraphqlModule } from './graphql.module';
import { LoaderService, createWmsLoaders } from './helpers';

/**
 * Material quantities are `Float` in the schema, not `Int`.
 *
 * #237 made the service layer exact for fractional quantities, but every
 * quantity argument and field on the GraphQL surface was still `Int`, so a
 * quantity of 0.1 was refused at the variable-coercion step (and a stored 0.1
 * could not be serialised on the way out) before any service ran. This drives
 * receive, ship and transfer through the schema with 0.1 and reads the values
 * back.
 *
 * Requires a reachable PostgreSQL; override with WMS_TEST_DB_* env vars.
 */
const DB_HOST = process.env['WMS_TEST_DB_HOST'] ?? 'localhost';
const DB_PORT = Number(process.env['WMS_TEST_DB_PORT'] ?? 5432);
const DB_USER =
  process.env['WMS_TEST_DB_USER'] ?? process.env['USER'] ?? 'postgres';
const DB_PASS = process.env['WMS_TEST_DB_PASS'];
const DB_NAME =
  process.env['WMS_TEST_FLOAT_DB_NAME'] ?? 'wms_module_float_test';

/** Drop the test database and, unless `recreate` is false, create it empty. */
const resetDatabase = async (recreate = true): Promise<void> => {
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
    if (recreate) await client.query(`CREATE DATABASE "${DB_NAME}"`);
  } finally {
    await client.end();
  }
};

describe('float quantities through the GraphQL schema', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let entities: WmsEntities;
  let stockService: StockService;
  let batchService: BatchService;
  let receiveService: ReceiveInventoryOrderService;
  let shipService: ShipInventoryOrderService;
  let transferService: TransferOrderService;
  let schema: GraphQLSchema;
  let loaderService: LoaderService;

  let shelfId: string;
  let dockId: string;
  let materialId: string;
  let materialKey: string;

  let sequence = 0;
  const unique = (label: string): string => `${label}-${(sequence += 1)}`;

  const execute = async (
    source: string,
    variableValues?: Record<string, unknown>,
  ): Promise<ExecutionResult<Record<string, unknown>>> =>
    graphql({
      schema,
      source,
      variableValues,
      contextValue: { ...createWmsLoaders(loaderService) },
    }) as Promise<ExecutionResult<Record<string, unknown>>>;

  /** Fails with the GraphQL error text, so a coercion error is the message. */
  const run = async (
    source: string,
    variableValues?: Record<string, unknown>,
  ): Promise<Record<string, unknown>> => {
    const result = await execute(source, variableValues);

    if (result.errors?.length) {
      throw new Error(result.errors.map(({ message }) => message).join('\n'));
    }

    return result.data as Record<string, unknown>;
  };

  const seedBatch = async (quantity: number): Promise<string> => {
    const batch = await batchService.getBatch({
      key: unique('FLT-BATCH'),
      materialId,
    });
    const orderRepository = dataSource.getRepository<OrderEntity>(
      entities.order,
    );
    const base = await orderRepository.save(orderRepository.create({}));

    await dataSource.getRepository<StockEntityClass>(entities.stock).save({
      orderId: base.id,
      materialId,
      batchId: batch.id,
      locationId: shelfId,
      loaderId: stockService.resolveLoaderId(null),
      quantity,
    } as DeepPartial<StockEntityClass>);

    return batch.id;
  };

  const onHand = async (): Promise<number> => {
    const [row] = await dataSource.query<[{ total: string }]>(
      `SELECT COALESCE(SUM(quantity), 0)::float8::text AS total FROM "${dataSource.getMetadata(entities.stock).tablePath}" WHERE "materialId" = $1`,
      [materialId],
    );

    return Number(row.total);
  };

  const newLocation = async (key: string): Promise<string> => {
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
    stockService = app.get(StockService);
    batchService = app.get(BatchService);
    receiveService = app.get(ReceiveInventoryOrderService);
    shipService = app.get(ShipInventoryOrderService);
    transferService = app.get(TransferOrderService);
    schema = app.get(GraphQLSchemaHost).schema;
    loaderService = app.get(LoaderService);

    shelfId = await newLocation('FLT-SHELF');
    dockId = await newLocation('FLT-DOCK');

    materialKey = 'FLT-MATERIAL';
    materialId = (
      await dataSource
        .getRepository<MaterialEntityClass>(entities.material)
        .save(
          dataSource
            .getRepository<MaterialEntityClass>(entities.material)
            .create({ key: materialKey } as DeepPartial<MaterialEntityClass>),
        )
    ).id;
  });

  afterAll(async () => {
    await app?.close();
    await resetDatabase(false);
  });

  it('receive: 0.1 goes in and comes back out as 0.1', async () => {
    const created = await run(
      `mutation ($items: [CreateReceiveInventoryOrderItemArgs!]!, $key: ID!) {
         createReceiveInventoryOrder(key: $key, description: "float", items: $items) { id }
       }`,
      {
        key: unique('FLT-RCV'),
        items: [
          {
            description: 'float receive',
            serialId: unique('FLT-RCV-LINE'),
            materialKey,
            batchKey: unique('FLT-RB'),
            locationKey: 'FLT-SHELF',
            targetReceivedQuantity: 0.1,
            requireInspection: false,
          },
        ],
      },
    );
    const orderId = (created['createReceiveInventoryOrder'] as { id: string })
      .id;
    const [item] = await dataSource
      .getRepository<ReceiveInventoryOrderItemEntityClass>(
        receiveService.receiveInventoryOrderItemEntity,
      )
      .find({ where: { orderId } });

    await run(
      `mutation ($items: [ReceiveOrderArgs!]!) { receive(items: $items) }`,
      { items: [{ itemId: item.id, quantity: 0.1 }] },
    );

    const read = await run(
      `query ($id: ID!) {
         receiveInventoryOrder(id: $id) {
           items { targetReceivedQuantity receivedQuantity }
         }
       }`,
      { id: orderId },
    );

    expect(
      (
        read['receiveInventoryOrder'] as {
          items: { targetReceivedQuantity: number; receivedQuantity: number }[];
        }
      ).items,
    ).toEqual([{ targetReceivedQuantity: 0.1, receivedQuantity: 0.1 }]);
    expect(await onHand()).toBeCloseTo(0.1, 10);
  });

  it('ship: a reference of 0.1 and a shipment of 0.1', async () => {
    const batchId = await seedBatch(0.3);
    const before = await onHand();

    const created = await run(
      `mutation ($key: ID!, $references: [CreateShipInventoryOrderReferenceArgs!]!) {
         createShipInventoryOrder(key: $key, description: "float", references: $references) {
           id
           references { targetShippedQuantity shippedQuantity }
         }
       }`,
      {
        key: unique('FLT-SHIP'),
        references: [
          {
            serialId: unique('FLT-SHIP-REF'),
            materialKey,
            targetShippedQuantity: 0.1,
          },
        ],
      },
    );
    const order = created['createShipInventoryOrder'] as {
      id: string;
      references: { targetShippedQuantity: number; shippedQuantity: number }[];
    };

    expect(order.references).toEqual([
      { targetShippedQuantity: 0.1, shippedQuantity: 0 },
    ]);

    const itemId = await dataSource.transaction(async (manager) => {
      await shipService.addShipInventoryOrderItems(
        {
          orderId: order.id,
          items: [
            {
              materialId,
              batchId,
              locationId: shelfId,
              targetShippedQuantity: 0.1,
              status: StockStatus.FREE,
              serialId: unique('FLT-SHIP-LINE'),
              orderId: order.id,
            },
          ],
        },
        manager,
      );

      const [item] = await manager
        .getRepository<ShipInventoryOrderItemEntityClass>(
          shipService.shipInventoryOrderItemEntity,
        )
        .find({ where: { orderId: order.id } });

      return item.id;
    });

    await run(`mutation ($items: [ShipOrderArgs!]!) { ship(items: $items) }`, {
      items: [{ itemId, quantity: 0.1 }],
    });

    const read = await run(
      `query ($id: ID!) {
         shipInventoryOrder(id: $id) {
           items { targetShippedQuantity shippedQuantity }
         }
       }`,
      { id: order.id },
    );

    expect(
      (
        read['shipInventoryOrder'] as {
          items: { targetShippedQuantity: number; shippedQuantity: number }[];
        }
      ).items,
    ).toEqual([{ targetShippedQuantity: 0.1, shippedQuantity: 0.1 }]);
    expect(await onHand()).toBeCloseTo(before - 0.1, 10);
  });

  it('transfer: 0.1 moves and reads back as 0.1', async () => {
    const batchId = await seedBatch(0.3);
    const order = await transferService.createTransferOrder({
      locationId: dockId,
      items: [
        {
          locationId: shelfId,
          materialId,
          batchId,
          targetTransferredQuantity: 0.1,
        } as Parameters<
          TransferOrderService['createTransferOrder']
        >[0]['items'][number],
      ],
    });
    const [item] = await dataSource
      .getRepository<TransferOrderItemEntityClass>(
        transferService.transferOrderItemEntity,
      )
      .find({ where: { orderId: order.id } });

    await run(
      `mutation ($items: [TransferOrderArgs!]!) { transfer(items: $items) }`,
      { items: [{ itemId: item.id, quantity: 0.1 }] },
    );

    const read = await run(
      `query ($id: ID!) {
         transferOrder(id: $id) {
           items { targetTransferredQuantity transferredQuantity }
         }
       }`,
      { id: order.id },
    );

    expect(
      (
        read['transferOrder'] as {
          items: {
            targetTransferredQuantity: number;
            transferredQuantity: number;
          }[];
        }
      ).items,
    ).toEqual([{ targetTransferredQuantity: 0.1, transferredQuantity: 0.1 }]);
  });
});
