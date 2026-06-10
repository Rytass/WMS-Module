import type { WMSBaseModuleAsyncOptions } from '@rytass/wms-base-nestjs-module';

export const WMS_CORE_MODULE_OPTIONS = Symbol('WMS_CORE_MODULE_OPTIONS');

export interface WmsModuleCoreModuleOptions {
  defaultLoaderSerialId: string;
  defaultLoaderTypeKey: string;
  defaultLocationKey: string;
  /**
   * When `true`, stock domain events are enriched (one PK lookup per event, same
   * transaction) with `materialId / batchId / locationId / loaderId` from the
   * change's order item. Off by default. Usually set via the graphql module's
   * `forRootAsync({ enrichStockEvents })`, which forwards it here.
   */
  enrichStockEvents?: boolean;
}

export type WmsModuleCoreModuleAsyncOptions = WMSBaseModuleAsyncOptions &
  WmsModuleCoreModuleOptions;
