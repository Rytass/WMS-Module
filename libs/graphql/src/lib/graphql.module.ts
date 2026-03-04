import { Module } from '@nestjs/common';
import { GqlModuleAsyncOptions, GraphQLModule } from '@nestjs/graphql';
import { WMSBaseModuleAsyncOptions } from '@rytass/wms-base-nestjs-module';
import { WmsModuleCoreModule } from '@wms-module/core';
import { HelperModule, LoaderService } from './helpers';
import { LoaderMutation } from './mutations/loader.mutation';
import { LoaderQuery } from './queries/loader.query';
import { MaterialMutation } from './mutations/material.mutation';
import { MaterialQuery } from './queries/material.query';
import { StockQuery } from './queries/stock.query';
import { ReceiveInventoryOrderMutation } from './mutations/receive-inventory-order.mutation';
import { ReceiveInventoryOrderQuery } from './queries/recieve-inventory-order.query';
import { ShipInventoryOrderMutation } from './mutations/ship-inventory-order.mutation';
import { ShipInventoryOrderQuery } from './queries/ship-inventory-order.query';
import { LoaderResolver } from './resolvers/loader.resolver';
import { MaterialResolver } from './resolvers/material.resolver';
import { StockResolver } from './resolvers/stock.resolver';
import { WarehouseMapMutation } from './mutations/warehouse-map.mutation';
import { LocationResolver } from './resolvers/location.resolver';
import { LocationQuery } from './queries/location.query';
import { LocationMutation } from './mutations/location.mutation';
import { LoaderTypeResolver } from './resolvers/loader-type.resolver';
import { UnitQuery } from './queries/unit.query';
import { AggregatedStockResolver } from './resolvers/aggregated-stock.resolver';
import { TransferOrderMutation } from './mutations/transfer-order.mutation';
import { TransferOrderQuery } from './queries/transfer-order.query';
import { TransferOrderResolver } from './resolvers/transfer-order.resolver';
import { HoldInventoryOrderMutation } from './mutations/hold-inventory-order.mutation';
import { HoldInventoryOrderQuery } from './queries/hold-inventory-order.query';
import { HoldInventoryOrderResolver } from './resolvers/hold-inventory-order.resolver';
import { BatchQuery } from './queries/batch.query';
import { ChangeLogResolver } from './resolvers/change-log.resolver';
import {
  ReceiveInventoryOrderItemResolver,
  ReceiveInventoryOrderResolver,
} from './resolvers/receive-inventory-order.resolver';

const exportDependencies = [
  UnitQuery,
  LoaderMutation,
  LoaderQuery,
  LoaderResolver,
  LoaderTypeResolver,
  MaterialMutation,
  MaterialQuery,
  MaterialResolver,
  BatchQuery,
  StockQuery,
  StockResolver,
  ChangeLogResolver,
  AggregatedStockResolver,

  ReceiveInventoryOrderMutation,
  ReceiveInventoryOrderQuery,
  ReceiveInventoryOrderResolver,
  ReceiveInventoryOrderItemResolver,

  ShipInventoryOrderMutation,
  ShipInventoryOrderQuery,

  TransferOrderMutation,
  TransferOrderQuery,
  TransferOrderResolver,

  HoldInventoryOrderMutation,
  HoldInventoryOrderQuery,
  HoldInventoryOrderResolver,

  WarehouseMapMutation,
  LocationMutation,
  LocationQuery,
  LocationResolver,
  TransferOrderMutation,
];
@Module({
  providers: exportDependencies,
})
export class WmsModuleGraphqlModule {
  static forRootAsync(
    options: WMSBaseModuleAsyncOptions,
    gqlOptions: GqlModuleAsyncOptions,
  ) {
    const coreModule = WmsModuleCoreModule.forRootAsync(options);

    return {
      module: WmsModuleGraphqlModule,
      imports: [
        coreModule,
        HelperModule,
        GraphQLModule.forRootAsync({
          ...gqlOptions,
          imports: [HelperModule, ...(gqlOptions.imports || [])],
          inject: [LoaderService, ...(gqlOptions.inject || [])],
          useFactory: async (loaderService: LoaderService, ...args) => {
            const loaders = {
              batchSingle: loaderService.batchEntity(),
              batchMany: loaderService.batchEntities(),
              batchManyWithPagination:
                loaderService.batchEntitiesWithPagination(),
            };
            const originalFactory = gqlOptions.useFactory
              ? await gqlOptions.useFactory(...args)
              : {};
            return {
              ...originalFactory,
              context: async (contextArg: any) => {
                const context =
                  typeof gqlOptions.useFactory === 'function'
                    ? {
                        loaders,
                        ...(typeof contextArg === 'object' ? contextArg : {}),
                      }
                    : { loaders, ...contextArg };
                return context;
              },
            };
          },
        }),
      ],
      providers: exportDependencies,
      exports: [GraphQLModule, coreModule],
    };
  }
}
