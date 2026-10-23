import type { Provider } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  WMS_EVENT_EMITTER_BRIDGE,
  type WmsDomainEvent,
  type WmsEventEmitterBridge,
} from '@rytass/wms-module-core';

/**
 * Bridges WMS domain events onto `@nestjs/event-emitter`'s `EventEmitter2`, so
 * consumers can subscribe with `@OnEvent('wms.<event-name>')` instead of (or in
 * addition to) the typed `afterListeners`.
 *
 * Pass this into `WmsModuleGraphqlModule.forRootAsync({ eventEmitterBridge })`.
 * Importing this module is the only place `@nestjs/event-emitter` is referenced,
 * keeping it an entirely optional peer dependency — the core graphql module
 * never imports it.
 *
 * Prerequisite: register `EventEmitterModule.forRoot()` in your app so an
 * `EventEmitter2` instance is available for injection.
 *
 * @example
 * ```ts
 * import { wmsEventEmitterBridgeProvider } from '@rytass/wms-module-graphql/adapters/event-emitter';
 *
 * WmsModuleGraphqlModule.forRootAsync({
 *   ...coreOptions,
 *   eventEmitterBridge: wmsEventEmitterBridgeProvider,
 * });
 *
 * // elsewhere
 * @OnEvent('wms.stock.allocated')
 * handle(payload: WmsStockEventPayload) { ... }
 * ```
 */
export const wmsEventEmitterBridgeProvider: Provider = {
  provide: WMS_EVENT_EMITTER_BRIDGE,
  useFactory: (emitter: EventEmitter2): WmsEventEmitterBridge => ({
    forward: (event: WmsDomainEvent): void => {
      emitter.emit(`wms.${event.name}`, event.payload);
    },
  }),
  inject: [EventEmitter2],
};
