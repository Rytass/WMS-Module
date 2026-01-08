import { Module } from '@nestjs/common';
import { LoaderService } from './services/loader.service';
import {
  MaterialService,
  StockService,
  WMSBaseModule,
  WMSBaseModuleAsyncOptions,
  WMSBaseModuleOptions,
} from '@rytass/wms-base-nestjs-module';
import { ReceiveInventoryOrderService } from './services/receive-inventory-order.service';
import { ShipInventoryOrderService } from './services/ship-inventory-order.service';
import { ModelsModule } from './models/models.module';

const exportDependencies = [
  LoaderService,
  MaterialService,
  ReceiveInventoryOrderService,
  ShipInventoryOrderService,
  StockService,
];

@Module({})
export class WmsModuleCoreModule {
  static forRoot(options: WMSBaseModuleOptions) {
    return {
      module: WmsModuleCoreModule,
      imports: [WMSBaseModule.forRoot(options), ModelsModule],
      exports: exportDependencies,
    };
  }

  static forRootAsync(options: WMSBaseModuleAsyncOptions) {
    return {
      module: WmsModuleCoreModule,
      imports: [WMSBaseModule.forRootAsync(options), ModelsModule],
      exports: exportDependencies,
    };
  }
}
