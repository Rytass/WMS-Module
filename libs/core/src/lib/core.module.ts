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
  ReclassifyInventoryOrderService,
  ScrapeService,
  InventoryCountOrderService,
  QualityInspectionOrderService,
  WarehouseMapDataService,
} from './services';
import { BatchService } from './services/batch.service';
import { StockChangeSubscriber } from './events/stock-change.subscriber';
import { InventoryCountLockSubscriber } from './events/inventory-count-lock.subscriber';
import { WMS_STOCK_ENRICH } from './events/wms-event.tokens';
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
  ReclassifyInventoryOrderService,
  ScrapeService,
  InventoryCountOrderService,
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
        InventoryCountLockSubscriber,
        ...resolvedEntityProviders,
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
        InventoryCountLockSubscriber,
        ...resolvedEntityProviders,
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
        WMS_CORE_MODULE_OPTIONS,
      ],
    };
  }
}
