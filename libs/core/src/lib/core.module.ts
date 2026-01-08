import { Module } from '@nestjs/common';
import { LoaderService } from './services/loader.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  MaterialService,
  StockService,
  WMSBaseModule,
} from '@rytass/wms-base-nestjs-module';
import { ReceiveInventoryOrderService } from './services/receive-inventory-order.service';
import { ShipInventoryOrderService } from './services/ship-inventory-order.service';

const exportDependencies = [
  LoaderService,
  MaterialService,
  ReceiveInventoryOrderService,
  ShipInventoryOrderService,
  StockService,
];

@Module({})
export class WmsModuleCoreModule {
  static forRoot(options: any) {
    return {
      module: WmsModuleCoreModule,
      imports: [WMSBaseModule.forRoot(options), TypeOrmModule.forRoot(options)],
      exports: exportDependencies,
    };
  }
}
