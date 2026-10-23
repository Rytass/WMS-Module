import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GraphQLModule, GraphQLSchemaHost } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from 'pg';
import { ChildEntity, Column, DataSource, Repository } from 'typeorm';
import { ExecutionResult, GraphQLSchema, graphql } from 'graphql';
import {
  MaterialEntity as BaseMaterialEntity,
  RESOLVED_MATERIAL_REPO,
} from '@rytass/wms-base-nestjs-module';
import {
  MaterialEntity,
  MaterialEntityClass,
  MaterialService,
  WmsModuleCoreModule,
} from '@rytass/wms-module-core';
import { WmsModuleGraphqlModule } from './graphql.module';
import { LoaderService, createWmsLoaders } from './helpers';

/**
 * Proves the `materialEntity` option actually reaches every place the module
 * touches materials.
 *
 * Single table inheritance is what makes the suite sharp: every row written
 * through `TenantMaterialEntity` carries its own `entityName` discriminator, so
 * any code path still reaching for the built-in `MaterialEntityClass` reads zero
 * rows — an order with no items, a dropped ship reference, an empty stock
 * filter, a `null` GraphQL field. Each test below is one of those paths.
 *
 * The override is supplied through the async options factory on purpose: the
 * `MaterialEntity` Symbol is bound at DI time from `PROVIDE_MATERIAL_ENTITY`, so
 * an entity resolved asynchronously has to work as well as a static one.
 *
 * Requires a reachable PostgreSQL; override with WMS_TEST_DB_* env vars.
 */
const DB_HOST = process.env['WMS_TEST_DB_HOST'] ?? 'localhost';
const DB_PORT = Number(process.env['WMS_TEST_DB_PORT'] ?? 5432);
const DB_USER =
  process.env['WMS_TEST_DB_USER'] ?? process.env['USER'] ?? 'postgres';
const DB_PASS = process.env['WMS_TEST_DB_PASS'];
// Its own database: the child entity below adds a column to `materials`, and the
// sibling integration suite runs `synchronize` against its own schema in a
// parallel worker.
const DB_NAME =
  process.env['WMS_TEST_MATERIAL_DB_NAME'] ?? 'wms_module_material_entity_test';

/**
 * Stands in for a downstream project's own item master: same `materials` table,
 * own discriminator, own extra column.
 */
@ChildEntity()
class TenantMaterialEntity extends MaterialEntityClass {
  @Column({ type: 'varchar', nullable: true })
  erpCode!: string | null;
}

/**
 * Dropped rather than emptied: the schema is derived from this file's entity
 * set, and a leftover table from another suite would survive `synchronize`.
 */
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

interface MaterialNode {
  readonly id: string;
  readonly key: string;
}

describe('custom material entity (integration)', () => {
  let app: INestApplication;
  let schema: GraphQLSchema;
  let loaderService: LoaderService;
  let dataSource: DataSource;

  // Seeded once: the flow is cumulative (receive feeds stock, stock feeds ship
  // and reclassify) and every step asserts on the custom entity.
  let material: MaterialNode;
  let reclassifyTarget: MaterialNode;
  let receiveItemId: string;

  const execute = async (
    source: string,
  ): Promise<ExecutionResult<Record<string, unknown>>> =>
    graphql({
      schema,
      source,
      contextValue: { ...createWmsLoaders(loaderService) },
    }) as Promise<ExecutionResult<Record<string, unknown>>>;

  const executeOrFail = async (
    source: string,
  ): Promise<Record<string, unknown>> => {
    const { data, errors } = await execute(source);

    if (errors?.length) throw errors[0];

    return data as Record<string, unknown>;
  };

  const createMaterial = async (key: string): Promise<MaterialNode> => {
    const data = await executeOrFail(`
      mutation {
        createMaterial(
          key: "${key}"
          description: "${key}"
          baseUnit: "PCS"
          units: []
        ) { id key }
      }
    `);

    return data['createMaterial'] as MaterialNode;
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
        // The entity has to reach TypeORM as well; the module cannot register it
        // for us, because it is only known once the async factory resolves.
        TypeOrmModule.forFeature([TenantMaterialEntity]),
        WmsModuleGraphqlModule.forRootAsync({
          // Resolved asynchronously, exactly like the database credentials would
          // be — which is the whole point of reading the option at DI time.
          useFactory: async () => ({ materialEntity: TenantMaterialEntity }),
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

    schema = app.get(GraphQLSchemaHost).schema;
    loaderService = app.get(LoaderService);
    dataSource = app.get(DataSource);

    material = await createMaterial('CME-MAT-A');
    reclassifyTarget = await createMaterial('CME-MAT-B');
  });

  afterAll(async () => {
    await app?.close();
  });

  it('binds the MaterialEntity Symbol and MaterialService to the custom entity', () => {
    expect(app.get(MaterialEntity)).toBe(TenantMaterialEntity);
    expect(app.get(MaterialService).materialEntity).toBe(TenantMaterialEntity);
  });

  it('shares one entity with WMSBaseModule, from one option', () => {
    // Both layers derive from the same `WMSBaseModuleOptions.materialEntity`:
    // the base module resolves `RESOLVED_MATERIAL_REPO` from it, the core module
    // binds its `MaterialEntity` Symbol from `PROVIDE_MATERIAL_ENTITY`. There is
    // no forwarding step that could drift.
    const repository: Repository<MaterialEntityClass> = app.get(
      RESOLVED_MATERIAL_REPO,
    );

    expect(repository.target).toBe(TenantMaterialEntity);
  });

  it('createMaterial writes rows stamped with the custom discriminator', async () => {
    const custom = await dataSource
      .getRepository(TenantMaterialEntity)
      .findOneByOrFail({ key: 'CME-MAT-A' });

    expect(custom.id).toBe(material.id);
    expect(custom).toBeInstanceOf(TenantMaterialEntity);

    // The decisive assertion: the discriminator is written by whichever entity
    // the repository was opened on. Bound to the built-in class — as every
    // hard-coded `getRepository(MaterialEntityClass)` was — these rows would read
    // `MaterialEntityClass`, and the consumer's own columns would never be
    // written at all.
    //
    // (Reads are more forgiving: the override extends `MaterialEntityClass`, and
    // TypeORM widens a single-table query to the whole subtree, so the built-in
    // class still *finds* these rows. The write side is where it breaks.)
    await expect(
      dataSource.query('SELECT "entityName" FROM materials WHERE key = $1', [
        'CME-MAT-A',
      ]),
    ).resolves.toEqual([{ entityName: 'TenantMaterialEntity' }]);
  });

  it('round-trips a column that only the custom entity declares', async () => {
    const repository = dataSource.getRepository(TenantMaterialEntity);

    await repository.update({ id: material.id }, { erpCode: 'ERP-0001' });

    // Reached through the module's own service, not the test's repository.
    const [[found]] = await app
      .get(MaterialService)
      .findMany({ materialId: material.id });

    expect(found).toBeInstanceOf(TenantMaterialEntity);
    expect((found as TenantMaterialEntity).erpCode).toBe('ERP-0001');
  });

  it('resolves createMaterial through the GraphQL material query', async () => {
    const data = await executeOrFail(`
      query { material(key: "CME-MAT-A") { id key description } }
    `);

    expect(data['material']).toMatchObject({
      id: material.id,
      key: 'CME-MAT-A',
    });
  });

  it('keeps receive order items instead of silently dropping them', async () => {
    // `processReceiveInventoryOrderItems` swallows an unresolvable material and
    // returns the item-less accumulator, so a wrong entity shows up as an order
    // with zero items rather than as an error.
    const data = await executeOrFail(`
      mutation {
        createReceiveInventoryOrder(
          key: "CME-RO-1"
          description: "receive"
          items: [{
            description: "receive item"
            serialId: "CME-RO-1-1"
            batchKey: "CME-BATCH-1"
            materialKey: "CME-MAT-A"
            targetReceivedQuantity: 10
          }]
        ) { id items { id material { id key } } }
      }
    `);

    const order = data['createReceiveInventoryOrder'] as {
      readonly items: readonly {
        readonly id: string;
        readonly material: MaterialNode;
      }[];
    };

    expect(order.items).toHaveLength(1);
    expect(order.items[0].material).toMatchObject({
      id: material.id,
      key: 'CME-MAT-A',
    });

    receiveItemId = order.items[0].id;
  });

  it('receives stock against the custom material', async () => {
    const data = await executeOrFail(`
      mutation {
        receive(items: [{ itemId: "${receiveItemId}", quantity: 10 }])
      }
    `);

    expect(data['receive']).toBe(true);

    const [{ count }] = await dataSource.query(
      'SELECT COUNT(*)::int AS count FROM stocks WHERE "materialId" = $1',
      [material.id],
    );

    expect(count).toBeGreaterThan(0);
  });

  it('filters stock by materialKey through the custom entity join', async () => {
    // `StockService.findMany` joins the configured material entity to match
    // `materialKey`. It has to be the configured one: a consumer whose entity is
    // a sibling of `MaterialEntityClass` rather than a descendant would get an
    // empty result from the built-in class, and the join has to survive whatever
    // single-table discriminator TypeORM derives from it either way.
    const data = await executeOrFail(`
      query {
        stocks(materialKey: "CME-MAT-A", offset: 0, limit: 100) {
          total
          items { id quantity material { id key } }
        }
      }
    `);

    const { total, items } = data['stocks'] as {
      readonly total: number;
      readonly items: readonly { readonly material: MaterialNode }[];
    };

    expect(total).toBeGreaterThan(0);
    // `material` is the DataLoader path: `__entity` decides which repository the
    // loader opens, so it has to follow the same binding as everything else.
    items.forEach(({ material: resolved }) => {
      expect(resolved).toMatchObject({ id: material.id, key: 'CME-MAT-A' });
    });
  });

  it('does not match stock for a materialKey belonging to another material', async () => {
    const data = await executeOrFail(`
      query { stocks(materialKey: "CME-MAT-B", offset: 0, limit: 100) { total } }
    `);

    expect((data['stocks'] as { readonly total: number }).total).toBe(0);
  });

  it('keeps ship order references instead of silently dropping them', async () => {
    const data = await executeOrFail(`
      mutation {
        createShipInventoryOrder(
          key: "CME-SO-1"
          description: "ship"
          references: [{
            serialId: "CME-SO-1-1"
            materialKey: "CME-MAT-A"
            targetShippedQuantity: 2
          }]
        ) { id references { id material { id key } } }
      }
    `);

    const order = data['createShipInventoryOrder'] as {
      readonly id: string;
      readonly references: readonly {
        readonly id: string;
        readonly material: MaterialNode;
      }[];
    };

    expect(order.references).toHaveLength(1);
    expect(order.references[0].material).toMatchObject({
      id: material.id,
      key: 'CME-MAT-A',
    });
  });

  it('updates a ship order reference that resolves its batch through the material', async () => {
    // The update path calls `findOneByOrFail` on the material repository, so a
    // wrong entity throws `EntityNotFoundError` instead of quietly returning
    // nothing.
    const created = await executeOrFail(`
      mutation {
        createShipInventoryOrder(
          key: "CME-SO-2"
          description: "ship"
          references: []
        ) { id }
      }
    `);

    const { id } = created['createShipInventoryOrder'] as {
      readonly id: string;
    };

    const data = await executeOrFail(`
      mutation {
        updateShipInventoryOrder(
          id: "${id}"
          references: [{
            serialId: "CME-SO-2-1"
            materialKey: "CME-MAT-A"
            batchKey: "CME-BATCH-1"
            targetShippedQuantity: 1
          }]
        ) { id references { id material { id key } batch { id key } } }
      }
    `);

    const order = data['updateShipInventoryOrder'] as {
      readonly references: readonly {
        readonly material: MaterialNode;
        readonly batch: { readonly key: string } | null;
      }[];
    };

    expect(order.references).toHaveLength(1);
    expect(order.references[0].material).toMatchObject({ id: material.id });
    expect(order.references[0].batch?.key).toBe('CME-BATCH-1');
  });

  it('reclassifies stock onto another custom material', async () => {
    // `reclassify` resolves the target material with `findOneOrFail`, so a wrong
    // entity throws before any stock moves.
    const stocks = await executeOrFail(`
      query {
        aggregatedStocks(materialKey: "CME-MAT-A", offset: 0, limit: 10) {
          items { id quantity }
        }
      }
    `);

    const [aggregated] = (
      stocks['aggregatedStocks'] as {
        readonly items: readonly {
          readonly id: string;
          readonly quantity: number;
        }[];
      }
    ).items;

    expect(aggregated).toBeDefined();

    const data = await executeOrFail(`
      mutation {
        reclassifyInventoryOrder(
          materialKey: "CME-MAT-B"
          items: [{ aggregatedKey: "${aggregated.id}", quantity: 1 }]
        ) { id key }
      }
    `);

    expect(data['reclassifyInventoryOrder']).toMatchObject({
      id: expect.any(String),
      key: expect.any(String),
    });

    const moved = await executeOrFail(`
      query {
        stocks(materialKey: "CME-MAT-B", offset: 0, limit: 100) {
          total
          items { quantity material { id key } }
        }
      }
    `);

    const { total, items } = moved['stocks'] as {
      readonly total: number;
      readonly items: readonly {
        readonly quantity: number;
        readonly material: MaterialNode;
      }[];
    };

    expect(total).toBeGreaterThan(0);
    expect(items[0].material).toMatchObject({
      id: reclassifyTarget.id,
      key: 'CME-MAT-B',
    });
  });

  /**
   * The read side needs its own control. The override extends
   * `MaterialEntityClass`, and a single-table query widens to the whole subtree,
   * so reading through the built-in class still finds the override's rows — the
   * two are only distinguishable in the other direction. A row written by the
   * built-in class is *outside* the override's subtree, so anything still bound
   * to `MaterialEntityClass` picks it up and anything correctly bound to the
   * override does not.
   */
  describe('a material row that belongs to the built-in entity', () => {
    let legacyId: string;

    beforeAll(async () => {
      const builtIn = dataSource.getRepository(MaterialEntityClass);
      const [{ id: unitId }] = await dataSource.query(
        'SELECT id FROM units LIMIT 1',
      );

      const legacy = await builtIn.save(
        builtIn.create({
          key: 'CME-MAT-LEGACY',
          description: 'written through the built-in class',
          baseUnit: unitId,
          isActive: true,
        }),
      );

      legacyId = legacy.id;
    });

    it('is invisible to the configured entity', async () => {
      await expect(
        dataSource
          .getRepository(TenantMaterialEntity)
          .findOneBy({ key: 'CME-MAT-LEGACY' }),
      ).resolves.toBeNull();
    });

    it('is not picked up as a receive order item', async () => {
      const data = await executeOrFail(`
        mutation {
          createReceiveInventoryOrder(
            key: "CME-RO-LEGACY"
            description: "receive"
            items: [{
              description: "legacy item"
              serialId: "CME-RO-LEGACY-1"
              batchKey: "CME-BATCH-LEGACY"
              materialKey: "CME-MAT-LEGACY"
              targetReceivedQuantity: 1
            }]
          ) { id items { id } }
        }
      `);

      expect(
        (data['createReceiveInventoryOrder'] as { readonly items: unknown[] })
          .items,
      ).toHaveLength(0);
    });

    it('is not picked up as a ship order reference', async () => {
      const data = await executeOrFail(`
        mutation {
          createShipInventoryOrder(
            key: "CME-SO-LEGACY"
            description: "ship"
            references: [{
              serialId: "CME-SO-LEGACY-1"
              materialKey: "CME-MAT-LEGACY"
              targetShippedQuantity: 1
            }]
          ) { id references { id } }
        }
      `);

      expect(
        (
          data['createShipInventoryOrder'] as {
            readonly references: unknown[];
          }
        ).references,
      ).toHaveLength(0);
    });

    it('cannot be used as a reclassify target', async () => {
      const { errors } = await execute(`
        mutation {
          reclassifyInventoryOrder(
            materialKey: "CME-MAT-LEGACY"
            items: []
          ) { id }
        }
      `);

      expect(errors?.[0]?.message).toMatch(/Could not find any entity/i);
    });

    it('does not resolve through the material DataLoader', async () => {
      // Clone one of the custom material's stock rows onto the legacy material so
      // the stock exists but its material sits outside the configured entity.
      await dataSource.query(
        `INSERT INTO stocks ("materialId", "batchId", "locationId", "orderId", quantity, "loaderId", "entityName")
         SELECT $1, "batchId", "locationId", "orderId", quantity, "loaderId", "entityName"
         FROM stocks WHERE "materialId" = $2 LIMIT 1`,
        [legacyId, material.id],
      );

      const { errors } = await execute(`
        query {
          stocks(materialId: "${legacyId}", offset: 0, limit: 10) {
            total
            items { id material { id key } }
          }
        }
      `);

      expect(errors?.[0]?.message).toMatch(/StockDto\.material/);
    });

    it('cannot be attached to a ship order reference on update', async () => {
      // The update path resolves the material with `findOneByOrFail` before
      // looking up the batch, so a row outside the configured entity aborts it.
      const created = await executeOrFail(`
        mutation {
          createShipInventoryOrder(
            key: "CME-SO-LEGACY-2"
            description: "ship"
            references: []
          ) { id }
        }
      `);

      const { id } = created['createShipInventoryOrder'] as {
        readonly id: string;
      };

      const { errors } = await execute(`
        mutation {
          updateShipInventoryOrder(
            id: "${id}"
            references: [{
              serialId: "CME-SO-LEGACY-2-1"
              materialKey: "CME-MAT-LEGACY"
              batchKey: "CME-BATCH-LEGACY"
              targetShippedQuantity: 1
            }]
          ) { id }
        }
      `);

      expect(errors?.[0]?.message).toMatch(/Could not find any entity/i);
    });

    it('still matches the materialKey stock filter, which joins by table', async () => {
      // Documented, not aspirational. `StockService` joins the material entity
      // through a hand-written ON clause, and TypeORM resolves an entity in that
      // position to its table name without appending a discriminator — so every
      // child of `materials` matches. Binding that join to the configured entity
      // is still right (it follows the entity to whatever table it is mapped to,
      // and it stops the service from importing a class it should not know
      // about), but unlike the paths above it is not what tells the built-in
      // class apart from an override.
      const data = await executeOrFail(`
        query {
          stocks(materialKey: "CME-MAT-LEGACY", offset: 0, limit: 10) { total }
        }
      `);

      expect((data['stocks'] as { readonly total: number }).total).toBe(1);
    });
  });
});

describe('materialEntity configuration errors', () => {
  const bootWith = (
    materialEntity: new () => MaterialEntityClass,
    register: boolean,
  ): Promise<unknown> =>
    Test.createTestingModule({
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
        ...(register ? [TypeOrmModule.forFeature([materialEntity])] : []),
        WmsModuleCoreModule.forRootAsync({
          useFactory: async () => ({ materialEntity }),
          defaultLoaderSerialId: 'DEFAULT',
          defaultLoaderTypeKey: 'DEFAULT',
          defaultLocationKey: 'DEFAULT',
        }),
      ],
    })
      .compile()
      .then((moduleRef) => moduleRef.createNestApplication().init());

  it('rejects an entity that does not extend MaterialEntityClass', async () => {
    // Structurally assignable to the base contract, so nothing catches it at
    // compile time — but it has none of the columns this package reads.
    @ChildEntity()
    class SiblingMaterialEntity extends BaseMaterialEntity {}

    await expect(
      bootWith(SiblingMaterialEntity as unknown as new () => MaterialEntityClass, true),
    ).rejects.toThrow(/must extend MaterialEntityClass/);
  });

  it('rejects an entity that was never registered with TypeORM', async () => {
    // The columns still land in `materials` (TypeORM copies a single-table
    // child's columns into its parent), so only this check separates a working
    // setup from one that throws EntityMetadataNotFoundError at first query.
    @ChildEntity()
    class UnregisteredMaterialEntity extends MaterialEntityClass {
      @Column({ type: 'varchar', nullable: true })
      note!: string | null;
    }

    await expect(bootWith(UnregisteredMaterialEntity, false)).rejects.toThrow(
      /are not registered with TypeORM \(materialEntity: UnregisteredMaterialEntity\)/,
    );
  });
});
