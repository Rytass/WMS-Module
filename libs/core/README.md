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

WMS is built on `@rytass/wms-base-nestjs-module`'s entity-as-class pattern: each entity is exported in two forms — `BatchEntity` (the concrete class) and `BatchEntityClass` (the constructor type). Pass custom classes via `WMSBaseModuleOptions` to add columns or override behavior. See `@rytass/wms-base-nestjs-module` docs for the override mechanism.

## Module options token

The three `default*` options are exposed via the `WMS_CORE_MODULE_OPTIONS` Symbol provider, which downstream services can `@Inject` if they need to read those values directly.

## License

MIT
