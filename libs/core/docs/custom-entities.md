# Custom entities

How to make a downstream project's own table the WMS's table, instead of keeping
a second one in sync.

> Applies to `@rytass/wms-module-core` and `@rytass/wms-module-graphql`.
> All six entities `WMSBaseModuleOptions` exposes are supported. Requires
> `@rytass/wms-base-nestjs-module` >= 0.4.0.

## Table of Contents

1. [What the option does](#1-what-the-option-does)
2. [Writing the entity](#2-writing-the-entity)
3. [Passing it to the module](#3-passing-it-to-the-module)
4. [Registering the entity with TypeORM](#4-registering-the-entity-with-typeorm)
5. [What single-table inheritance means for your data](#5-what-single-table-inheritance-means-for-your-data)
6. [Overriding more than one](#6-overriding-more-than-one)

---

## 1. What the option does

`@rytass/wms-base-nestjs-module` has always accepted entity overrides in
`WMSBaseModuleOptions`, but it kept the resolved entities to itself: the tokens
were never exported, so `@rytass/wms-module-core` could not read them and bound
its own entity Symbols to the built-in classes unconditionally. The options
therefore changed nothing above the base layer.

`wms-base` 0.3.0 exports `PROVIDE_*_ENTITY` and `RESOLVED_*_REPO` (the same
shape `@rytass/member-base-nestjs-module` has always used for `memberEntity`),
and the core module binds its Symbols from those tokens at injection time.

| Option               | Table            | Replaces               | Also reached by                                            |
|----------------------|------------------|------------------------|------------------------------------------------------------|
| `materialEntity`     | `materials`      | `MaterialEntityClass`  | `MaterialService`, receive / ship / reclassify, stock filters |
| `batchEntity`        | `batches`        | `BatchEntityClass`     | `BatchService`, split / merge / reclassify                 |
| `locationEntity`     | `locations`      | `LocationEntityClass`  | `LocationService`, receive, transfers, startup seeding      |
| `stockEntity`        | `stocks`         | `StockEntityClass`     | `StockService` and every path that moves stock              |
| `orderEntity`        | `orders`         | `OrderEntityClass`     | every order service — one row per stock movement            |
| `warehouseMapEntity` | `warehouse_maps` | `WarehouseMapEntity`   | `WarehouseMapDataService` and the map mutation              |

Nothing in either package imports these classes as values any more. Every
service, DataLoader and query reaches them through a `Symbol`, so rebinding one
swaps that entity everywhere at once — including the GraphQL DataLoaders, which
would otherwise resolve `null` for an override and fail their non-nullable
fields.

`WmsEntities` is the injectable holding the resolved classes, exported for
consumers who need the same answer:

```ts
import { WmsEntities } from '@rytass/wms-module-core';

@Injectable()
export class MyService {
  constructor(private readonly entities: WmsEntities) {}

  find(): Promise<unknown[]> {
    return this.dataSource.getRepository(this.entities.material).find();
  }
}
```

## 2. Writing the entity

Each override must be a TypeORM `@ChildEntity()` extending the class it replaces.
It joins the existing table through single-table inheritance; it does not move
the data anywhere.

```ts
import { ChildEntity, Column, Index } from 'typeorm';
import {
  BatchEntityClass,
  LocationEntityClass,
  MaterialEntityClass,
} from '@rytass/wms-module-core';

@ChildEntity()
export class ItemMasterEntity extends MaterialEntityClass {
  @Column({ type: 'varchar', nullable: true })
  @Index()
  erpCode!: string | null;
}

@ChildEntity()
export class LotEntity extends BatchEntityClass {
  @Column({ type: 'date', nullable: true })
  expiresOn!: Date | null;
}

@ChildEntity()
export class BinEntity extends LocationEntityClass {
  @Column({ type: 'varchar', nullable: true })
  zone!: string | null;
}
```

Rules:

- **Extend the class this package exports, not the base one.** `MaterialEntityClass`,
  `BatchEntityClass`, `LocationEntityClass` and `StockEntityClass` add the columns
  the services and DTOs read; the base classes do not declare them. `OrderEntityClass`
  and the warehouse map entity are the base classes — this package adds nothing to
  those two — and are re-exported so every override reads the same way.
- **New columns must be nullable or have a default.** Rows written before the
  override existed carry the old discriminator and have no value for them.
- **Do not re-declare `@Entity()` or `@TableInheritance()`.** Both belong to the
  class you are extending; `@ChildEntity()` is the whole decoration you need. The
  same goes for `@Tree()` on a location override — inherit it, do not repeat it.
- The module refuses to boot if an override does not extend the right class.
  `WMSBaseModuleOptions` only asks for a child of the *base* entity, and
  TypeScript's structural typing will happily accept a sibling that never
  declares the columns this package reads.

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
    batchEntity: LotEntity,
    locationEntity: BinEntity,
  }),

  defaultLoaderSerialId: 'DEFAULT',
  defaultLoaderTypeKey: 'DEFAULT',
  defaultLocationKey: 'DEFAULT',
});
```

Override as few or as many as you like; anything left out keeps its built-in
class.

### `forRoot`

```ts
WmsModuleCoreModule.forRoot(
  { materialEntity: ItemMasterEntity, batchEntity: LotEntity },
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

If a class does not extend the one it replaces, the module refuses to boot —
`WMSBaseModuleOptions` only asks for a child of the *base* entity, and
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
    TypeOrmModule.forFeature([ItemMasterEntity, LotEntity, BinEntity]),
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
WmsModuleCoreModule: configured entities are not registered with TypeORM
(materialEntity: ItemMasterEntity, batchEntity: LotEntity). Add them to your
DataSource "entities", or import TypeOrmModule.forFeature([ItemMasterEntity,
LotEntity]) somewhere in your app when using autoLoadEntities.
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

## 6. Overriding more than one

The overrides are independent — take one, take all six, mix and match. They are
resolved from the same options object and validated together at startup, so a
partial configuration is a normal state rather than a special case.

One caveat worth knowing when overriding `warehouseMapEntity`: its table gained
its `entityName` discriminator column in `wms-base` 0.4.0, and it is **nullable**
precisely so existing rows survive the upgrade. A single-table root is queried
without a discriminator filter, so rows written before the upgrade stay readable
through the built-in class. They are *not* visible to an override, for the same
reason described in section 5 — backfill them if you need them:

```sql
UPDATE warehouse_maps SET "entityName" = 'YourMapEntity' WHERE "entityName" IS NULL;
```

The other five tables have carried a discriminator since long before this
feature, so only `warehouse_maps` needs the column added. If you run migrations
rather than `synchronize`, generate one for it.
