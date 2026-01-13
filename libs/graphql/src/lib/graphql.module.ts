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

const exportDependencies = [
  LoaderMutation,
  LoaderQuery,
  MaterialMutation,
  MaterialQuery,
  StockQuery,
  ReceiveInventoryOrderMutation,
  ReceiveInventoryOrderQuery,
  ShipInventoryOrderMutation,
  ShipInventoryOrderQuery,
];
@Module({
  providers: exportDependencies,
})
export class WmsModuleGraphqlModule {
  static forRootAsync(
    options: WMSBaseModuleAsyncOptions,
    gqlOptions: GqlModuleAsyncOptions
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
            const originalFactory = gqlOptions.useFactory
              ? await gqlOptions.useFactory(...args)
              : {};
            return {
              ...originalFactory,
              loaders: {
                batchSingle: loaderService.batchEntity(),
                batchMany: loaderService.batchEntities(),
                batchManyWithPagination:
                  loaderService.batchEntitiesWithPagination(),
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
