# @rytass/wms-module-core

NestJS services and TypeORM entities for the Rytass Warehouse Management System (WMS). Builds on top of [`@rytass/wms-base-nestjs-module`](https://www.npmjs.com/package/@rytass/wms-base-nestjs-module) and ships ~20 domain services covering loaders, locations, materials, batches, inventory orders (receive / ship / hold / allocate), transfers (customer / vendor / internal), quality inspection, scrape, split / merge batch, reclassification and warehouse map data.

This package only provides the data and service layer. Pair it with [`@rytass/wms-module-graphql`](https://www.npmjs.com/package/@rytass/wms-module-graphql) to expose a GraphQL API.

## Install

```bash
yarn add @rytass/wms-module-core
# peer deps
yarn add @nestjs/common @nestjs/typeorm typeorm reflect-metadata @rytass/wms-base-nestjs-module
```

## Quick start

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WmsModuleCoreModule } from '@rytass/wms-module-core';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: 5432,
      username: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      autoLoadEntities: true,
      synchronize: false,
    }),
    WmsModuleCoreModule.forRoot(
      {
        /* WMSBaseModuleOptions — entity overrides, DataSource opts, etc. */
      },
      {
        defaultLoaderSerialId: 'DEFAULT',
        defaultLoaderTypeKey: 'DEFAULT',
        defaultLocationKey: 'DEFAULT',
      },
    ),
  ],
})
export class AppModule {}
```

Use `WmsModuleCoreModule.forRootAsync({ ... })` when you need to load options from a config service or async source. The async signature merges `WMSBaseModuleAsyncOptions` (factory / inject pattern from the base module) with the three `default*` keys above.

## Injecting services

Every domain service is exported and injectable once `WmsModuleCoreModule` is imported:

```ts
import { Injectable } from '@nestjs/common';
import { LoaderService, StockService } from '@rytass/wms-module-core';

@Injectable()
export class MyService {
  constructor(
    private readonly loaders: LoaderService,
    private readonly stock: StockService,
  ) {}
}
```

Exported services include `LoaderService`, `MaterialService`, `BatchService`, `StockService`, `LocationService`, `UnitService`, `HelperService`, `WarehouseMapDataService`, `ReceiveInventoryOrderService`, `ShipInventoryOrderService`, `HoldInventoryOrderService`, `AllocateInventoryOrderService`, `TransferOrderService`, `TransferCustomerOrderService`, `TransferVendorOrderService`, `SaleOrderService`, `SplitBatchOrderService`, `MergeBatchOrderService`, `ReclassifyInventoryOrderService`, `ScrapeService`, `QualityInspectionOrderService`, `InventoryCountOrderService`.

## Inventory counting

`InventoryCountOrderService` implements counting: create an order over a set of locations
(expanded to every descendant), start it, record what was found, then settle the variance
into stock.

```ts
const order = await counts.create({
  name: '2026 上半年度例行盤點',
  countDate: '2026-06-30',        // the business date the variance is reported under
  locationIds: [aisleId],         // every shelf underneath is pulled in
});

await counts.start(order.id);     // snapshots the ledger AND locks the scope
await counts.count(order.id, [{ itemId, countedQuantity: 94 }]);
await counts.settle(order.id);    // the only call that changes stock
```

Counting adjusts quantity **in place** — it never moves stock between locations; that is
what `TransferOrderService` is for. Uncounted lines are left alone rather than zeroed, and
a surplus may name a batch that does not exist yet (it is created during settlement).

> ⚠️ **`start()` locks the counted locations.** Until the order settles or is cancelled,
> any stock movement touching a location in its scope is refused with a `ConflictException`
> naming the count — including movements your own code makes by calling a service
> directly. The check sits on the insert of every `*_order_change` row, so it covers every
> path without any service needing to know about it, and it looks at both ends of a
> movement: a transfer *into* a counted location is refused too. This is what keeps the
> book snapshot the variance is measured against from going stale.

Every mutating method runs in one transaction and takes an optional `EntityManager` as
its last argument to join one you already hold. `settle()` re-reads the ledger before it
writes and refuses with a `ConflictException` if a scoped line's `bookQuantity` no longer
matches it — the lock makes that impossible through this package, so a mismatch means
something wrote to `stocks` around it.


## Operation names

Every root operation this package family exposes is named `` `${resource}:${action}` ``.
The union and its runtime counterpart are exported so a host can iterate them, diff them
against its own permission list, or drive
`@rytass/wms-module-graphql`'s `disabledOperations`:

```ts
import { WMS_OPERATION_NAMES, type WmsOperationName } from '@rytass/wms-module-core';
```

These are the same strings your `authChecker` receives as `{ resource, action }`.

## Extending entities

Each entity is exported in two forms — `MaterialEntity` (a `Symbol` DI token) and `MaterialEntityClass` (the entity class the token is bound to). Everything inside the module resolves entities through the token, so rebinding the token swaps the entity everywhere at once.

All six entity options `WMSBaseModuleOptions` exposes — `materialEntity`, `batchEntity`, `locationEntity`, `stockEntity`, `orderEntity`, `warehouseMapEntity` — are wired all the way through. Give one a `@ChildEntity()` of the class it replaces and your own table *is* the WMS table — no second table, no double writes:

```ts
import { ChildEntity, Column } from 'typeorm';
import {
  BatchEntityClass,
  MaterialEntityClass,
  WmsModuleCoreModule,
} from '@rytass/wms-module-core';

@ChildEntity()
export class ItemMasterEntity extends MaterialEntityClass {
  @Column({ type: 'varchar', nullable: true })
  erpCode!: string | null;
}

@ChildEntity()
export class LotEntity extends BatchEntityClass {
  @Column({ type: 'date', nullable: true })
  expiresOn!: Date | null;
}

WmsModuleCoreModule.forRootAsync({
  useFactory: async () => ({
    materialEntity: ItemMasterEntity,
    batchEntity: LotEntity,
  }),
  defaultLoaderSerialId: 'DEFAULT',
  defaultLoaderTypeKey: 'DEFAULT',
  defaultLocationKey: 'DEFAULT',
});
```

They are ordinary `WMSBaseModuleOptions` fields, so `forRoot` and the async factory both work, and you can override as few or as many as you like. The base module resolves its repositories from them and this package binds its entity Symbols from the same `PROVIDE_*_ENTITY` tokens at injection time — one option, two consumers, no way for them to drift. Needs `@rytass/wms-base-nestjs-module` >= 0.4.0.

`WmsEntities` is exported for consumers who need the resolved classes themselves:

```ts
constructor(private readonly entities: WmsEntities) {}
// this.entities.material / .batch / .location / .stock / .order / .warehouseMap
```

**You register the entities with TypeORM yourself** (`TypeOrmModule.forFeature([...])`, or the DataSource's `entities`). The module cannot: `forFeature()` runs while Nest assembles the module graph, before the options resolve. Forgetting almost works — TypeORM still creates your columns in the parent table — so the module checks at startup and refuses to boot with a message naming what to add.

[`docs/custom-entities.md`](./docs/custom-entities.md) has the full picture, including what single-table inheritance means for rows written before the override existed.

## Module options token

The three `default*` options are exposed via the `WMS_CORE_MODULE_OPTIONS` Symbol provider, which downstream services can `@Inject` if they need to read those values directly.

## Documentation

Full documentation is shipped inside this package under the `docs/` directory (available after `npm install`):

| Document | Description |
|---|---|
| [`docs/integration-guide.md`](./docs/integration-guide.md) | Step-by-step wiring guide for NestJS + Next.js consumers |
| [`docs/api-reference.md`](./docs/api-reference.md) | Complete export catalog with signatures and usage examples |
| [`docs/custom-entities.md`](./docs/custom-entities.md) | Using your own entity as the WMS material master, and the audit of the other entity options |

GitHub hosted links (always up-to-date):

- [Integration Guide — §4 Backend setup](https://github.com/Rytass/WMS-Module/blob/main/libs/graphql/docs/integration-guide.md#4-backend-setup-nestjs--graphql--typeorm)
- [API Reference — @rytass/wms-module-core](https://github.com/Rytass/WMS-Module/blob/main/libs/graphql/docs/api-reference.md#rytasswms-module-core)

## License

MIT
