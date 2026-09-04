import {
  DynamicModule,
  Module,
  type Provider,
  type Type,
} from '@nestjs/common';
import {
  PROVIDE_BATCH_ENTITY,
  PROVIDE_LOCATION_ENTITY,
  PROVIDE_MATERIAL_ENTITY,
  PROVIDE_ORDER_ENTITY,
  PROVIDE_STOCK_ENTITY,
  PROVIDE_WAREHOUSE_MAP_ENTITY,
  WMSBaseModule,
  WMSBaseModuleOptions,
} from '@rytass/wms-base-nestjs-module';
import { WarehouseMapEntity as WarehouseMapEntityClass } from '@rytass/wms-base-nestjs-module/models/warehouse-map.entity';
import { ModelsModule } from './models/models.module';
import { WmsEntities } from './models/wms-entities';
import { BatchEntity, BatchEntityClass } from './models/metadata/batch.entity';
import {
  LocationEntity,
  LocationEntityClass,
  WarehouseMapEntity,
} from './models/metadata/location.entity';
import {
  MaterialEntity,
  MaterialEntityClass,
} from './models/metadata/material.entity';
import { OrderEntity, OrderEntityClass } from './models/metadata/order.entity';
import { StockEntity, StockEntityClass } from './models/metadata/stock.entity';
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
  OrderReferenceService,
  ConsumptionOrderService,
  ReclassifyInventoryOrderService,
  ScrapeService,
  InventoryCountOrderService,
  QualityInspectionOrderService,
  WarehouseMapDataService,
} from './services';
import { BatchService } from './services/batch.service';
import { StockChangeSubscriber } from './events/stock-change.subscriber';
import { InventoryCountLockSubscriber } from './events/inventory-count-lock.subscriber';
import {
  WMS_ACTOR_EXTRACTOR,
  WMS_CUSTOM_CHANGE_TABLES,
  WMS_EVENT_OPTIONS,
  WMS_STOCK_ENRICH,
} from './events/wms-event.tokens';
import type { WmsCustomChangeTable } from './typings/custom-change-table';
import { WmsEventDispatcher } from './events/wms-event.dispatcher';
import { WmsOperationRunner } from './events/wms-operation-runner';
import type { WmsEventWiringOptions } from './typings/core-module-options';
import { WMS_CORE_MODULE_OPTIONS } from './typings/core-module-options';
import type {
  WmsModuleCoreModuleAsyncOptions,
  WmsModuleCoreModuleOptions,
} from './typings/core-module-options';

/**
 * The entity Symbols a consumer can rebind, each paired with the base module's
 * token carrying their replacement and the class it falls back to.
 *
 * These Symbols are how the whole package reaches an entity — no service,
 * DataLoader or query imports the class directly — so rebinding one here swaps
 * that entity everywhere at once. Resolution happens at injection time, from
 * tokens `WMSBaseModule` derives from its own options, which means an override
 * may arrive from `forRoot` or from an async options factory alike and cannot
 * drift from the repository the base module resolved: both come from one option.
 */
const OVERRIDABLE_ENTITIES: readonly {
  readonly option: string;
  readonly token: symbol;
  readonly provide: symbol;
  readonly fallback: Type<object>;
  readonly requires?: string;
}[] = [
  {
    option: 'materialEntity',
    token: MaterialEntity,
    provide: PROVIDE_MATERIAL_ENTITY,
    fallback: MaterialEntityClass,
    requires: 'description / baseUnit / isActive',
  },
  {
    option: 'batchEntity',
    token: BatchEntity,
    provide: PROVIDE_BATCH_ENTITY,
    fallback: BatchEntityClass,
  },
  {
    option: 'locationEntity',
    token: LocationEntity,
    provide: PROVIDE_LOCATION_ENTITY,
    fallback: LocationEntityClass,
    requires: 'description / isActive',
  },
  {
    option: 'stockEntity',
    token: StockEntity,
    provide: PROVIDE_STOCK_ENTITY,
    fallback: StockEntityClass,
    requires: 'loaderId / rollbackedAt',
  },
  {
    option: 'orderEntity',
    token: OrderEntity,
    provide: PROVIDE_ORDER_ENTITY,
    fallback: OrderEntityClass,
  },
  {
    option: 'warehouseMapEntity',
    token: WarehouseMapEntity,
    provide: PROVIDE_WAREHOUSE_MAP_ENTITY,
    fallback: WarehouseMapEntityClass,
  },
];

const entityProviders: Provider[] = OVERRIDABLE_ENTITIES.map(
  ({ option, token, provide, fallback, requires }) => ({
    provide: token,
    useFactory: (configured: Type<object> | null): Type<object> => {
      if (!configured || configured === fallback) return fallback;

      // `WMSBaseModuleOptions` only asks for a child of the *base* entity, but
      // this package reads the columns its own subclass adds. TypeScript's
      // structural typing happily accepts a sibling that never declares them,
      // which then surfaces as a missing column mid-query — a much worse error
      // to work backwards from than this one.
      if (!(configured.prototype instanceof fallback))
        throw new Error(
          `WmsModuleCoreModule: ${option} "${configured.name}" must extend ${fallback.name} (a @ChildEntity() of it)${
            requires
              ? `. @rytass/wms-module-core reads ${requires} from it, which the base entity does not declare`
              : ''
          }.`,
        );

      return configured;
    },
    inject: [provide],
  }),
);

/** Bound after {@link entityProviders}, since it reads every one of them. */
const resolvedEntityProviders: Provider[] = [...entityProviders, WmsEntities];

const exportedEntityTokens = [
  ...OVERRIDABLE_ENTITIES.map(({ token }) => token),
  WmsEntities,
];

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
  OrderReferenceService,
  ConsumptionOrderService,
  ReclassifyInventoryOrderService,
  ScrapeService,
  InventoryCountOrderService,
  QualityInspectionOrderService,
  WarehouseMapDataService,
];

/**
 * The event machinery, bound here rather than in the graphql module so a
 * consumer that only installs `@rytass/wms-module-core` still gets hooks,
 * listeners and `WmsOperationRunner`. `WmsModuleGraphqlModule` forwards its own
 * event options down to `forRootAsync`, which keeps exactly one binding per
 * token — two live bindings would resolve to whichever module the injector
 * reached first, the same hazard the overridable entity Symbols avoid.
 */
const eventProviders = (wiring: WmsEventWiringOptions): Provider[] => [
  {
    provide: WMS_EVENT_OPTIONS,
    useValue: {
      beforeHooks: wiring.beforeHooks,
      afterListeners: wiring.afterListeners,
    },
  },
  { provide: WMS_ACTOR_EXTRACTOR, useValue: wiring.actorExtractor ?? null },
  WmsEventDispatcher,
  WmsOperationRunner,
  ...(wiring.eventEmitterBridge ? [wiring.eventEmitterBridge] : []),
];

const eventExports = [
  WmsEventDispatcher,
  WmsOperationRunner,
  WMS_EVENT_OPTIONS,
  WMS_ACTOR_EXTRACTOR,
];

/**
 * Reject a registration that would shadow one of this package's own change
 * tables.
 *
 * Silently letting a host redefine `receive_inventory_order_changes` would
 * reclassify every receipt in the warehouse from somewhere the reader of that
 * report would never think to look. Refusing at module-definition time costs a
 * startup crash and buys an obvious one.
 */
const OWNED_CHANGE_TABLES: ReadonlySet<string> = new Set([
  'receive_inventory_order_changes',
  'ship_inventory_order_changes',
  'transfer_order_changes',
  'transfer_vendor_order_changes',
  'transfer_customer_order_changes',
  'hold_inventory_order_changes',
  'allocate_inventory_order_changes',
  'split_batch_order_changes',
  'merge_batch_order_changes',
  'reclassify_inventory_order_changes',
  'scrape_order_changes',
  'inventory_count_order_changes',
  'consumption_order_changes',
  'quality_inspection_order_changes',
]);

const assertCustomChangeTables = (
  tables: readonly WmsCustomChangeTable[] | undefined,
): readonly WmsCustomChangeTable[] => {
  if (!tables?.length) return [];

  const seen = new Set<string>();

  for (const { table } of tables) {
    if (OWNED_CHANGE_TABLES.has(table)) {
      throw new Error(
        `WmsModuleCoreModule: customChangeTables cannot register "${table}" — this package owns it.`,
      );
    }

    if (seen.has(table)) {
      throw new Error(
        `WmsModuleCoreModule: customChangeTables registers "${table}" twice.`,
      );
    }

    if (!table.endsWith('_order_changes')) {
      // The inventory count lock keys off this suffix, so a table without it
      // gets events but silently escapes the lock — the worse half of the
      // bargain, and not one a host would knowingly take.
      throw new Error(
        `WmsModuleCoreModule: customChangeTables entry "${table}" must end in "_order_changes" so the inventory count lock covers it too.`,
      );
    }

    seen.add(table);
  }

  return tables;
};

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
        InventoryCountLockSubscriber,
        ...resolvedEntityProviders,
        ...eventProviders(coreOptions),
        {
          provide: WMS_CUSTOM_CHANGE_TABLES,
          useValue: assertCustomChangeTables(coreOptions.customChangeTables),
        },
        { provide: WMS_CORE_MODULE_OPTIONS, useValue: coreOptions },
        {
          provide: WMS_STOCK_ENRICH,
          useValue: !!coreOptions.enrichStockEvents,
        },
      ],
      exports: [
        ...exportDependencies,
        coreModule,
        ModelsModule,
        ...exportedEntityTokens,
        ...eventExports,
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
      beforeHooks,
      afterListeners,
      actorExtractor,
      eventEmitterBridge,
      customChangeTables,
      ...baseOptions
    } = options;
    const coreModule = WMSBaseModule.forRootAsync(baseOptions);
    return {
      module: WmsModuleCoreModule,
      imports: [coreModule, ModelsModule],
      providers: [
        ...exportDependencies,
        StockChangeSubscriber,
        InventoryCountLockSubscriber,
        ...resolvedEntityProviders,
        ...eventProviders({
          beforeHooks,
          afterListeners,
          actorExtractor,
          eventEmitterBridge,
        }),
        {
          provide: WMS_CUSTOM_CHANGE_TABLES,
          useValue: assertCustomChangeTables(customChangeTables),
        },
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
        ...exportedEntityTokens,
        ...eventExports,
        WMS_CORE_MODULE_OPTIONS,
      ],
    };
  }
}
