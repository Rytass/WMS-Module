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
} from './services';

const exportDependencies = [
  LoaderService,
  MaterialService,
  ReceiveInventoryOrderService,
  ShipInventoryOrderService,
  StockService,
  LocationService,
  UnitService,
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
