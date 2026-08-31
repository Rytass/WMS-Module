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
export {
  pruneDisabledOperations,
  type PrunedOperations,
  type WmsOperationRegistrationOptions,
} from './lib/registry';
export type { WmsModuleGraphqlModuleAsyncOptions } from './lib/graphql.module';
export {
  WmsMutationEvent,
  WmsMutationInterceptor,
  WMS_MUTATION_EVENT_METADATA,
  type WmsMutationEventConfig,
  type WmsOperationResultMap,
  type WmsEventPayloadFor,
  type WmsTypedAfterEventContext,
  type WmsTypedAfterListenerMap,
  type WmsTypedBeforeHookContext,
  type WmsTypedBeforeHookMap,
} from './lib/events';
// Re-export the event contracts from core for convenience (single import site).
export type {
  WmsActor,
  WmsActorExtractor,
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
  WmsOperationName,
  WmsStockEventName,
  WmsStockEventPayload,
} from '@rytass/wms-module-core';
export { WMS_OPERATION_NAMES } from '@rytass/wms-module-core';
