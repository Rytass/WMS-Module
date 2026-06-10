import { DynamicModule, Module, type Provider } from '@nestjs/common';
import { WmsModuleCoreModule, WmsEventDispatcher } from '@rytass/wms-module-core';
import {
  WMS_ACTOR_EXTRACTOR,
  WMS_EVENT_OPTIONS,
  type WmsActorExtractor,
  type WmsModuleCoreModuleAsyncOptions,
  type WmsEventModuleOptions,
} from '@rytass/wms-module-core';
import { HelperModule } from './helpers';
import {
  WMS_AUTH_OPTIONS,
  WmsAuthGuard,
  type WmsAuthModuleOptions,
} from './auth';
import {
  WmsMutationInterceptor,
  type WmsTypedAfterListenerMap,
  type WmsTypedBeforeHookMap,
} from './events';
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
import {
  TransferOrderItemResolver,
  TransferOrderResolver,
} from './resolvers/transfer-order.resolver';
import { HoldInventoryOrderMutation } from './mutations/hold-inventory-order.mutation';
import { HoldInventoryOrderQuery } from './queries/hold-inventory-order.query';
import { HoldInventoryOrderResolver } from './resolvers/hold-inventory-order.resolver';
import { BatchQuery } from './queries/batch.query';
import { ChangeLogResolver } from './resolvers/change-log.resolver';
import {
  ReceiveInventoryOrderItemResolver,
  ReceiveInventoryOrderResolver,
} from './resolvers/receive-inventory-order.resolver';
import { AllocateInventoryOrderQuery } from './queries/allocate-inventory-order.query';
import { AllocateInventoryOrderResolver } from './resolvers/allocate-inventory-order.resolver';
import { AllocateInventoryOrderMutation } from './mutations/allocate-inventory-order.mutation';
import {
  ShipInventoryOrderItemResolver,
  ShipInventoryOrderReferenceResolver,
  ShipInventoryOrderResolver,
} from './resolvers/ship-inventory-order.resolver';
import { SaleOrderQuery } from './queries/sale-order.query';
import { SplitBatchMutation } from './mutations/split-batch.mutation';
import { MergeBatchMutation } from './mutations/merge-batch.mutation';
import { ReclassifyInventoryOrderMutation } from './mutations/reclassify-inventory-order.mutation';
import { TransferCustomerOrderMutation } from './mutations/transfer-customer-order.mutation';
import { TransferCustomerOrderResolver } from './resolvers/transfer-customer-order.resolver';
import { TransferVendorOrderMutation } from './mutations/transfer-vendor-order.mutation';
import { TransferVendorOrderResolver } from './resolvers/transfer-vendor-order.resolver';
import { SplitBatchResolver } from './resolvers/split-batch.resolver';
import { MergeBatchOrderResolver } from './resolvers/merge-batch.resolver';
import { ScrapeMutation } from './mutations/scrape-order.mutation';
import { QualityInspectionOrderMutation } from './mutations/quality-inspection-order.mutation';
import { WarehouseMapDataQuery } from './queries/warehouse-map.query';
import { MapRangeUnionResolver } from './resolvers/warehouse-map.resolver';

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
  ShipInventoryOrderResolver,
  ShipInventoryOrderItemResolver,
  ShipInventoryOrderReferenceResolver,

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
  TransferOrderResolver,
  TransferOrderItemResolver,

  AllocateInventoryOrderQuery,
  AllocateInventoryOrderResolver,
  AllocateInventoryOrderMutation,

  TransferCustomerOrderMutation,
  TransferCustomerOrderResolver,

  TransferVendorOrderMutation,
  TransferVendorOrderResolver,

  SaleOrderQuery,

  SplitBatchMutation,
  SplitBatchResolver,
  MergeBatchMutation,
  MergeBatchOrderResolver,
  ReclassifyInventoryOrderMutation,

  ScrapeMutation,
  QualityInspectionOrderMutation,

  WarehouseMapDataQuery,
  MapRangeUnionResolver,
];
/**
 * Options for `WmsModuleGraphqlModule.forRootAsync`. Extends the core module
 * options with:
 * - {@link WmsAuthModuleOptions.authChecker} — opt-in resolver authorization;
 * - `beforeHooks` (veto) / `afterListeners` (post-commit notify) — the mutation
 *   event/hook system, **typed per event** (operation events carry their concrete
 *   DTO via {@link WmsTypedAfterListenerMap});
 * - `actorExtractor` — populates `payload.actor` on every event (pass
 *   `memberBaseActorExtractor` from the member-base adapter, or your own);
 * - `enrichStockEvents` — when `true`, stock events also carry
 *   `materialId/batchId/locationId/loaderId` (inherited from the core options);
 * - `eventEmitterBridge` — pass `wmsEventEmitterBridgeProvider` from
 *   `@rytass/wms-module-graphql/adapters/event-emitter` to also fan events out
 *   to `@nestjs/event-emitter` (`@OnEvent('wms.<event>')`).
 *
 * Everything is optional; with nothing configured the module behaves exactly as
 * before (no events emitted, fully permissive).
 */
export type WmsModuleGraphqlModuleAsyncOptions = WmsModuleCoreModuleAsyncOptions &
  WmsAuthModuleOptions & {
    readonly beforeHooks?: WmsTypedBeforeHookMap;
    readonly afterListeners?: WmsTypedAfterListenerMap;
    readonly actorExtractor?: WmsActorExtractor;
    readonly eventEmitterBridge?: Provider;
  };

@Module({
  providers: exportDependencies,
})
export class WmsModuleGraphqlModule {
  static forRootAsync(
    options: WmsModuleGraphqlModuleAsyncOptions,
  ): DynamicModule {
    const {
      authChecker,
      beforeHooks,
      afterListeners,
      actorExtractor,
      eventEmitterBridge,
      ...coreOptions
    } = options;
    // coreOptions still carries `enrichStockEvents`, forwarded to the core module.
    const coreModule = WmsModuleCoreModule.forRootAsync(coreOptions);

    const authOptions: WmsAuthModuleOptions = { authChecker };
    // The typed hook maps are a compile-time refinement of the core maps; at
    // runtime the dispatched payload IS the concrete result type, so handing the
    // refined maps to the (looser) core option contract is sound.
    const eventOptions: WmsEventModuleOptions = {
      beforeHooks: beforeHooks as WmsEventModuleOptions['beforeHooks'],
      afterListeners: afterListeners as WmsEventModuleOptions['afterListeners'],
    };

    const providers: Provider[] = [
      ...exportDependencies,
      WmsAuthGuard,
      { provide: WMS_AUTH_OPTIONS, useValue: authOptions },
      { provide: WMS_EVENT_OPTIONS, useValue: eventOptions },
      { provide: WMS_ACTOR_EXTRACTOR, useValue: actorExtractor ?? null },
      WmsEventDispatcher,
      WmsMutationInterceptor,
      ...(eventEmitterBridge ? [eventEmitterBridge] : []),
    ];

    return {
      module: WmsModuleGraphqlModule,
      imports: [coreModule, HelperModule],
      providers,
      exports: [...exportDependencies, WmsAuthGuard, HelperModule, coreModule],
    };
  }
}
