import { DynamicModule, Module, type Provider } from '@nestjs/common';
import {
  PROVIDE_MATERIAL_ENTITY,
  WMSBaseModule,
  WMSBaseModuleOptions,
} from '@rytass/wms-base-nestjs-module';
import { ModelsModule } from './models/models.module';
import {
  MaterialEntity,
  MaterialEntityClass,
} from './models/metadata/material.entity';
import {
  LoaderService,
  MaterialService,
  StockService,
  LocationService,
  ReceiveInventoryOrderService,
  ShipInventoryOrderService,
  UnitService,
  HelperService,
  TransferOrderService,
  TransferCustomerOrderService,
  TransferVendorOrderService,
  HoldInventoryOrderService,
  AllocateInventoryOrderService,
  SaleOrderService,
  SplitBatchOrderService,
  MergeBatchOrderService,
  ReclassifyInventoryOrderService,
  ScrapeService,
  QualityInspectionOrderService,
  WarehouseMapDataService,
} from './services';
import { BatchService } from './services/batch.service';
import { StockChangeSubscriber } from './events/stock-change.subscriber';
import { WMS_STOCK_ENRICH } from './events/wms-event.tokens';
import { WMS_CORE_MODULE_OPTIONS } from './typings/core-module-options';
import type {
  WmsModuleCoreModuleAsyncOptions,
  WmsModuleCoreModuleOptions,
} from './typings/core-module-options';

/**
 * Binds the `MaterialEntity` Symbol to the entity the consumer configured
 * through `WMSBaseModuleOptions.materialEntity`, falling back to the built-in
 * `MaterialEntityClass`.
 *
 * This is the single seam that makes the option real above the base layer.
 * `PROVIDE_MATERIAL_ENTITY` is resolved by `WMSBaseModule` from its own options
 * — so it works identically for `forRoot` and for an async factory — and every
 * service, DataLoader and query in this package reads the entity through this
 * Symbol rather than importing the class. Rebinding here therefore swaps the
 * material entity everywhere at once, and cannot drift from the repository the
 * base module resolved: both are derived from the same option.
 */
const MaterialEntityProvider: Provider = {
  provide: MaterialEntity,
  useFactory: (
    configured: (new () => MaterialEntityClass) | null,
  ): new () => MaterialEntityClass => {
    if (!configured) return MaterialEntityClass;

    // `WMSBaseModuleOptions` only asks for a child of the base `MaterialEntity`,
    // but this package's services and its `MaterialDto` read `description`,
    // `baseUnit` and `isActive` — the columns `MaterialEntityClass` adds. A
    // sibling would type-check against the base contract and then fail as a
    // missing column at query time, which is a far worse error to debug.
    if (!(configured.prototype instanceof MaterialEntityClass))
      throw new Error(
        `WmsModuleCoreModule: materialEntity "${configured.name}" must extend MaterialEntityClass (a @ChildEntity() of it). @rytass/wms-module-core reads description / baseUnit / isActive from it, which the base MaterialEntity does not declare.`,
      );

    return configured;
  },
  inject: [PROVIDE_MATERIAL_ENTITY],
};

const exportDependencies = [
  LoaderService,
  MaterialService,
  BatchService,
  ReceiveInventoryOrderService,
  ShipInventoryOrderService,
  TransferOrderService,
  TransferCustomerOrderService,
  TransferVendorOrderService,
  HoldInventoryOrderService,
  AllocateInventoryOrderService,
  StockService,
  LocationService,
  UnitService,
  HelperService,
  SaleOrderService,
  SplitBatchOrderService,
  MergeBatchOrderService,
  ReclassifyInventoryOrderService,
  ScrapeService,
  QualityInspectionOrderService,
  WarehouseMapDataService,
];

@Module({
  providers: exportDependencies,
})
export class WmsModuleCoreModule {
  static forRoot(
    options: WMSBaseModuleOptions,
    coreOptions: WmsModuleCoreModuleOptions,
  ): DynamicModule {
    const coreModule = WMSBaseModule.forRoot(options);
    return {
      module: WmsModuleCoreModule,
      imports: [coreModule, ModelsModule],
      providers: [
        ...exportDependencies,
        StockChangeSubscriber,
        MaterialEntityProvider,
        { provide: WMS_CORE_MODULE_OPTIONS, useValue: coreOptions },
        { provide: WMS_STOCK_ENRICH, useValue: !!coreOptions.enrichStockEvents },
      ],
      exports: [
        ...exportDependencies,
        coreModule,
        ModelsModule,
        MaterialEntity,
        WMS_CORE_MODULE_OPTIONS,
      ],
    };
  }

  static forRootAsync(options: WmsModuleCoreModuleAsyncOptions): DynamicModule {
    const {
      defaultLoaderSerialId,
      defaultLoaderTypeKey,
      defaultLocationKey,
      enrichStockEvents,
      ...baseOptions
    } = options;
    const coreModule = WMSBaseModule.forRootAsync(baseOptions);
    return {
      module: WmsModuleCoreModule,
      imports: [coreModule, ModelsModule],
      providers: [
        ...exportDependencies,
        StockChangeSubscriber,
        MaterialEntityProvider,
        {
          provide: WMS_CORE_MODULE_OPTIONS,
          useValue: {
            defaultLoaderSerialId,
            defaultLoaderTypeKey,
            defaultLocationKey,
          },
        },
        { provide: WMS_STOCK_ENRICH, useValue: !!enrichStockEvents },
      ],
      exports: [
        ...exportDependencies,
        coreModule,
        ModelsModule,
        MaterialEntity,
        WMS_CORE_MODULE_OPTIONS,
      ],
    };
  }
}
