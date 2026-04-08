import type { WMSBaseModuleAsyncOptions } from '@rytass/wms-base-nestjs-module';

export const WMS_CORE_MODULE_OPTIONS = Symbol('WMS_CORE_MODULE_OPTIONS');

export interface WmsModuleCoreModuleOptions {
  defaultLoaderSerialId: string;
  defaultLoaderTypeKey: string;
  defaultLocationKey: string;
}

export type WmsModuleCoreModuleAsyncOptions = WMSBaseModuleAsyncOptions &
  WmsModuleCoreModuleOptions;
