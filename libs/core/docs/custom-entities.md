# Custom entities

How to make a downstream project's own table the WMS's table, instead of keeping
a second one in sync.

> Applies to `@rytass/wms-module-core` and `@rytass/wms-module-graphql`.
> Currently supported for **materials**; see the [audit](#6-audit-of-the-remaining-entity-options)
> for where the other entities stand.
>
> Requires `@rytass/wms-base-nestjs-module` >= 0.3.0, which is the release that
> exports the resolved entity tokens this depends on.

## Table of Contents

1. [What the option does](#1-what-the-option-does)
2. [Writing the entity](#2-writing-the-entity)
3. [Passing it to the module](#3-passing-it-to-the-module)
4. [Registering the entity with TypeORM](#4-registering-the-entity-with-typeorm)
5. [What single-table inheritance means for your data](#5-what-single-table-inheritance-means-for-your-data)
6. [Audit of the remaining entity options](#6-audit-of-the-remaining-entity-options)

---

## 1. What the option does

`@rytass/wms-base-nestjs-module` has always accepted a `materialEntity` in
`WMSBaseModuleOptions`, but it kept the resolved entity to itself: the token was
never exported, so `@rytass/wms-module-core` could not read it and bound its
`MaterialEntity` Symbol to the built-in `MaterialEntityClass` unconditionally.
The option therefore changed nothing above the base layer.

`wms-base` 0.3.0 exports `PROVIDE_MATERIAL_ENTITY` and `RESOLVED_MATERIAL_REPO`
(the same shape `@rytass/member-base-nestjs-module` has always used for
`memberEntity`), and the core module now binds its Symbol from that token at
injection time.

Passing `materialEntity` now rebinds every place the module reads or writes
materials:

| Consumer of the material entity                        | Where it lives                                            |
|--------------------------------------------------------|-----------------------------------------------------------|
| `MaterialEntity` Symbol (and its TypeORM registration) | `libs/core/src/lib/models/models.module.ts`               |
| `MaterialService` (create / update / find)             | `libs/core/src/lib/services/material.service.ts`          |
| Receive order item resolution                          | `libs/core/src/lib/services/receive-inventory-order.service.ts` |
| Ship order reference resolution (create and update)    | `libs/core/src/lib/services/ship-inventory-order.service.ts` |
| Reclassify target resolution                           | `libs/core/src/lib/services/reclassify-inventory-order.service.ts` |
| `materialKey` stock filter and material grouping       | `libs/core/src/lib/services/stock.service.ts`             |
| Every GraphQL `material` DataLoader                    | `libs/graphql/src/lib/resolvers/*.resolver.ts`            |
| `RESOLVED_MATERIAL_REPO` in the base module            | resolved from the same option — cannot drift               |

## 2. Writing the entity

The entity must be a TypeORM `@ChildEntity()` extending `MaterialEntityClass`.
It joins the existing `materials` table through single-table inheritance; it does
not move the data anywhere.

```ts
import { ChildEntity, Column, Index } from 'typeorm';
import { MaterialEntityClass } from '@rytass/wms-module-core';

@ChildEntity()
export class ItemMasterEntity extends MaterialEntityClass {
  @Column({ type: 'varchar', nullable: true })
  @Index()
  erpCode!: string | null;

  @Column({ type: 'varchar', nullable: true })
  vendorPartNumber!: string | null;
}
```

Rules:

- **Extend `MaterialEntityClass`, not the base `MaterialEntity`.** The module's
  services and the `MaterialDto` GraphQL type read `description`, `baseUnit` and
  `isActive`, which `MaterialEntityClass` declares.
- **New columns must be nullable or have a default.** Rows written before the
  override existed carry the old discriminator and have no value for them.
- **Do not re-declare `@Entity()` or `@TableInheritance()`.** Both belong to the
  base `MaterialEntity`; `@ChildEntity()` is the whole decoration you need.

## 3. Passing it to the module

`materialEntity` is a `WMSBaseModuleOptions` field, so it goes wherever the rest
of the base options go — including the async factory:

### `forRootAsync`

```ts
WmsModuleGraphqlModule.forRootAsync({
  imports: [VaultModule],
  inject: [VaultService],
  useFactory: async (vault: VaultService) => ({
    allowNegativeStock: await vault.get<boolean>('ALLOW_NEGATIVE_STOCK'),
    materialEntity: ItemMasterEntity,
  }),

  defaultLoaderSerialId: 'DEFAULT',
  defaultLoaderTypeKey: 'DEFAULT',
  defaultLocationKey: 'DEFAULT',
});
```

### `forRoot`

```ts
WmsModuleCoreModule.forRoot(
  { materialEntity: ItemMasterEntity },
  {
    defaultLoaderSerialId: 'DEFAULT',
    defaultLoaderTypeKey: 'DEFAULT',
    defaultLocationKey: 'DEFAULT',
  },
);
```

You pass it once. The base module resolves its repository from it and the core
module binds its `MaterialEntity` Symbol from it; both read the same option, so
there is no forwarding step that could get them out of step.

If the class does not extend `MaterialEntityClass`, the module refuses to boot —
`WMSBaseModuleOptions` only asks for a child of the *base* `MaterialEntity`, and
TypeScript's structural typing will not catch a sibling that happens to look
right.

## 4. Registering the entity with TypeORM

**You** register the override; the module cannot. `TypeOrmModule.forFeature()`
runs while Nest assembles the module graph, and the entity is not known until the
options resolve.

```ts
@Module({
  imports: [
    TypeOrmModule.forRoot({ /* ... */ autoLoadEntities: true }),
    TypeOrmModule.forFeature([ItemMasterEntity]),
    WmsModuleGraphqlModule.forRootAsync({ /* ... */ }),
  ],
})
export class AppModule {}
```

`entities: [ItemMasterEntity, ...]` on the DataSource works just as well.

This is easy to forget, because forgetting it *almost* works: TypeORM copies a
single-table child's columns into its parent, so `synchronize` still creates your
columns in `materials` and the schema looks correct. Only the queries fail. The
module checks for it at startup and refuses to boot rather than letting an
`EntityMetadataNotFoundError` surface later from inside a resolver:

```
WmsModuleCoreModule: the configured materialEntity "ItemMasterEntity" is not
registered with TypeORM. Add it to your DataSource "entities", or import
TypeOrmModule.forFeature([ItemMasterEntity]) somewhere in your app when using
autoLoadEntities.
```

## 5. What single-table inheritance means for your data

All material rows live in `materials`, and the `entityName` column records which
class wrote each one.

- Rows written **after** you configure the override carry your class's name.
- Rows written **before** it carry `MaterialEntityClass`, and your entity's
  queries will not see them: a single-table query matches its own class and its
  descendants, never its ancestors or siblings. Backfilling those rows
  (`UPDATE materials SET "entityName" = 'ItemMasterEntity' WHERE …`) is a
  consumer-side migration; the module does not attempt it.
- Reading through `MaterialEntityClass` still returns your rows, because your
  class is a descendant of it. The asymmetry only bites in the other direction.

## 6. Audit of the remaining entity options

`WMSBaseModuleOptions` exposes six entity overrides. Only `materialEntity` is
honoured above the base layer today. The rest resolve a base-module repository
that `@rytass/wms-module-core` never reads, so setting them has no effect on core
or graphql:

| Option                | Base token                    | Core Symbol         | Status | Hard-coded call sites remaining                                  |
|-----------------------|-------------------------------|---------------------|--------|------------------------------------------------------------------|
| `materialEntity`      | `RESOLVED_MATERIAL_REPO`      | `MaterialEntity`    | supported | 0                                                             |
| `batchEntity`         | `RESOLVED_BATCH_REPO`         | `BatchEntity`       | not supported | 5 `getRepository(BatchEntityClass)` in core, 11 resolver `__entity` |
| `locationEntity`      | `RESOLVED_TREE_LOCATION_REPO` | `LocationEntity`    | not supported | 5 in core, 12 resolver `__entity`                            |
| `stockEntity`         | `RESOLVED_STOCK_REPO`         | `StockEntity`       | not supported | 8 in core (services inject the Symbol *and* hard-code the class) |
| `orderEntity`         | `RESOLVED_ORDER_REPO`         | none                | not supported | 17 `getRepository(OrderEntity)` on the base class directly   |
| `warehouseMapEntity`  | `RESOLVED_WAREHOUSE_MAP_REPO` | `WarehouseMapEntity`| not supported | `WarehouseMapDataService` resolves the base class directly   |

All six tokens are exported by `wms-base` 0.3.0, so extending support to another
entity no longer needs a base-module change: bind its Symbol from the matching
`PROVIDE_*_ENTITY` in `WmsModuleCoreModule` the way `MaterialEntity` is bound,
then sweep the call sites listed above. `orderEntity` is the largest job and the
only one with no core Symbol at all.
