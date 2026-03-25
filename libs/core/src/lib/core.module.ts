import { Module } from '@nestjs/common';
import {
  WMSBaseModule,
  WMSBaseModuleAsyncOptions,
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
} from './services';
import { BatchService } from './services/batch.service';

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
];

@Module({
  providers: exportDependencies,
})
export class WmsModuleCoreModule {
  static forRoot(options: WMSBaseModuleOptions) {
    const coreModule = WMSBaseModule.forRoot(options);
    return {
      module: WmsModuleCoreModule,
      imports: [coreModule, ModelsModule],
      exports: [...exportDependencies, coreModule, ModelsModule],
    };
  }

  static forRootAsync(options: WMSBaseModuleAsyncOptions) {
    const coreModule = WMSBaseModule.forRootAsync(options);
    return {
      module: WmsModuleCoreModule,
      imports: [coreModule, ModelsModule],
      exports: [...exportDependencies, coreModule, ModelsModule],
    };
  }
}
