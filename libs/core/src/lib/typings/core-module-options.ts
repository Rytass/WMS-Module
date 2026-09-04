import type { Provider } from '@nestjs/common';
import type { WMSBaseModuleAsyncOptions } from '@rytass/wms-base-nestjs-module';
import type {
  WmsActorExtractor,
  WmsAfterListenerMap,
  WmsBeforeHookMap,
} from '../events/wms-event.types';

export const WMS_CORE_MODULE_OPTIONS = Symbol('WMS_CORE_MODULE_OPTIONS');

/**
 * The event/hook wiring, accepted here rather than only on the graphql module.
 *
 * `WmsOperationRunner` gives a host the same guarantee for a direct service
 * call that the interceptor gives a GraphQL mutation, so a consumer that never
 * installs `@rytass/wms-module-graphql` still needs somewhere to declare its
 * hooks and listeners. `WmsModuleGraphqlModule.forRootAsync` forwards its own
 * event options straight down to here, so there is exactly one binding of each
 * token no matter which module a consumer imports.
 */
export interface WmsEventWiringOptions {
  readonly beforeHooks?: WmsBeforeHookMap;
  readonly afterListeners?: WmsAfterListenerMap;
  /** Populates `payload.actor` on every event. */
  readonly actorExtractor?: WmsActorExtractor;
  /**
   * A provider for `WMS_EVENT_EMITTER_BRIDGE` — pass
   * `wmsEventEmitterBridgeProvider` from
   * `@rytass/wms-module-graphql/adapters/event-emitter` to also fan events out
   * to `@nestjs/event-emitter`.
   */
  readonly eventEmitterBridge?: Provider;
}

export interface WmsModuleCoreModuleOptions extends WmsEventWiringOptions {
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
