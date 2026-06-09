export * from './lib/graphql.module';
export { LoaderService } from './lib/helpers/loader.service';
export type {
  LoaderOptions,
  LoaderOptionsWithPagination,
} from './lib/helpers/loader.service';
export type { LoaderType } from './lib/helpers/dataloader.type';
export {
  createWmsLoaders,
  type WmsLoaders,
} from './lib/helpers/create-wms-loaders';
export {
  HOST_SKIP_METADATA_KEY,
  WmsAuthGuard,
  WmsOperation,
  WMS_AUTH_OPTIONS,
  WMS_OPERATION_METADATA,
  type WmsAuthChecker,
  type WmsAuthModuleOptions,
  type WmsOperationRequirement,
} from './lib/auth';
export type { WmsModuleGraphqlModuleAsyncOptions } from './lib/graphql.module';
export {
  WmsMutationEvent,
  WmsMutationInterceptor,
  WMS_MUTATION_EVENT_METADATA,
  type WmsMutationEventConfig,
} from './lib/events';
// Re-export the event contracts from core for convenience (single import site).
export type {
  WmsAfterEventContext,
  WmsAfterListener,
  WmsAfterListenerMap,
  WmsBeforeHook,
  WmsBeforeHookContext,
  WmsBeforeHookMap,
  WmsDomainEvent,
  WmsEventModuleOptions,
  WmsEventName,
  WmsEventPayloadMap,
  WmsOperationEventName,
  WmsOperationEventPayload,
  WmsStockEventName,
  WmsStockEventPayload,
} from '@rytass/wms-module-core';

