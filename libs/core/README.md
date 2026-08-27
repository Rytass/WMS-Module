# @rytass/wms-module-core

NestJS services and TypeORM entities for the Rytass Warehouse Management System (WMS). Builds on top of [`@rytass/wms-base-nestjs-module`](https://www.npmjs.com/package/@rytass/wms-base-nestjs-module) and ships ~20 domain services covering loaders, locations, materials, batches, inventory orders (receive / ship / hold / allocate), transfers (customer / vendor / internal), quality inspection, scrape, split / merge batch, reclassification and warehouse map data.

This package only provides the data and service layer. Pair it with [`@rytass/wms-module-graphql`](https://www.npmjs.com/package/@rytass/wms-module-graphql) to expose a GraphQL API.

## Install

```bash
yarn add @rytass/wms-module-core
# peer deps
yarn add @nestjs/common @nestjs/typeorm typeorm rxjs reflect-metadata
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

Exported services include `LoaderService`, `MaterialService`, `BatchService`, `StockService`, `LocationService`, `UnitService`, `HelperService`, `WarehouseMapDataService`, `ReceiveInventoryOrderService`, `ShipInventoryOrderService`, `HoldInventoryOrderService`, `AllocateInventoryOrderService`, `TransferOrderService`, `TransferCustomerOrderService`, `TransferVendorOrderService`, `SaleOrderService`, `SplitBatchOrderService`, `MergeBatchOrderService`, `ReclassifyInventoryOrderService`, `ScrapeService`, `QualityInspectionOrderService`.

## Extending entities

Each entity is exported in two forms — `MaterialEntity` (a `Symbol` DI token) and `MaterialEntityClass` (the entity class the token is bound to). Everything inside the module resolves entities through the token, so rebinding the token swaps the entity everywhere at once.

`materialEntity` is the override that is wired all the way through today. Give it a `@ChildEntity()` of `MaterialEntityClass` and your own table *is* the WMS material master — no second table, no double writes:

```ts
import { ChildEntity, Column } from 'typeorm';
import { MaterialEntityClass, WmsModuleCoreModule } from '@rytass/wms-module-core';

@ChildEntity()
export class ItemMasterEntity extends MaterialEntityClass {
  @Column({ type: 'varchar', nullable: true })
  erpCode!: string | null;
}

WmsModuleCoreModule.forRootAsync({
  useFactory: async () => ({ materialEntity: ItemMasterEntity }),
  defaultLoaderSerialId: 'DEFAULT',
  defaultLoaderTypeKey: 'DEFAULT',
  defaultLocationKey: 'DEFAULT',
});
```

It is an ordinary `WMSBaseModuleOptions` field, so `forRoot` and the async factory both work. The base module resolves its repository from it and this package binds its `MaterialEntity` Symbol from the same `PROVIDE_MATERIAL_ENTITY` token at injection time — one option, two consumers, no way for them to drift. This needs `@rytass/wms-base-nestjs-module` >= 0.3.0, the release that exports those tokens.

**You register the entity with TypeORM yourself** (`TypeOrmModule.forFeature([ItemMasterEntity])`, or the DataSource's `entities`). The module cannot: `forFeature()` runs while Nest assembles the module graph, before the options resolve. Forgetting it almost works — TypeORM still creates your columns in `materials` — so the module checks at startup and refuses to boot with a message telling you what to add.

The remaining entity options on `WMSBaseModuleOptions` (`batchEntity`, `locationEntity`, `stockEntity`, `orderEntity`, `warehouseMapEntity`) still resolve only a base-module repository this package does not read — setting them has no effect above the base layer. [`docs/custom-entities.md`](./docs/custom-entities.md) has the full picture, the single-table-inheritance caveats for pre-existing rows, and the per-option audit.

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
