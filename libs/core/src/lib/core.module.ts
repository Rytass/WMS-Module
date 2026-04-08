import { Module } from '@nestjs/common';
import {
  WMSBaseModule,
  WMSBaseModuleOptions,
} from '@rytass/wms-base-nestjs-module';
import { ModelsModule } from './models/models.module';
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
} from './services';
import { BatchService } from './services/batch.service';
import { WMS_CORE_MODULE_OPTIONS } from './typings/core-module-options';
import type {
  WmsModuleCoreModuleAsyncOptions,
  WmsModuleCoreModuleOptions,
} from './typings/core-module-options';

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
];

@Module({
  providers: exportDependencies,
})
export class WmsModuleCoreModule {
  static forRoot(
    options: WMSBaseModuleOptions,
    coreOptions: WmsModuleCoreModuleOptions,
  ) {
    const coreModule = WMSBaseModule.forRoot(options);
    return {
      module: WmsModuleCoreModule,
      imports: [coreModule, ModelsModule],
      providers: [
        ...exportDependencies,
        { provide: WMS_CORE_MODULE_OPTIONS, useValue: coreOptions },
      ],
      exports: [
        ...exportDependencies,
        coreModule,
        ModelsModule,
        WMS_CORE_MODULE_OPTIONS,
      ],
    };
  }

  static forRootAsync(options: WmsModuleCoreModuleAsyncOptions) {
    const {
      defaultLoaderSerialId,
      defaultLoaderTypeKey,
      defaultLocationKey,
      ...baseOptions
    } = options;
    const coreModule = WMSBaseModule.forRootAsync(baseOptions);
    return {
      module: WmsModuleCoreModule,
      imports: [coreModule, ModelsModule],
      providers: [
        ...exportDependencies,
        {
          provide: WMS_CORE_MODULE_OPTIONS,
          useValue: {
            defaultLoaderSerialId,
            defaultLoaderTypeKey,
            defaultLocationKey,
          },
        },
      ],
      exports: [
        ...exportDependencies,
        coreModule,
        ModelsModule,
        WMS_CORE_MODULE_OPTIONS,
      ],
    };
  }
}
