import type { Provider } from '@nestjs/common';
import type { WMSBaseModuleAsyncOptions } from '@rytass/wms-base-nestjs-module';
import type {
  WmsActorExtractor,
  WmsAfterListenerMap,
  WmsBeforeHookMap,
} from '../events/wms-event.types';
import type { WmsCustomChangeTable } from './custom-change-table';

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
  /**
   * Change tables this package does not own, so a host's own order family still
   * emits `stock.*` events. Everything else a custom family needs -- the
   * transaction, the availability check, the inventory count lock -- it already
   * has. See {@link WmsCustomChangeTable}.
   */
  customChangeTables?: readonly WmsCustomChangeTable[];
  /**
   * Where order keys and loader serials are counted.
   *
   * - `'sequence'` (default): one PostgreSQL sequence per counter, created on
   *   first use with `CREATE SEQUENCE IF NOT EXISTS` -- what every existing
   *   deployment already has, so its numbering carries on.
   * - `'table'`: rows of the `sequences` table this package declares, advanced
   *   with one `INSERT … ON CONFLICT DO UPDATE … RETURNING`. No DDL at runtime,
   *   so it suits a host whose schema changes only through migrations; and the
   *   increment is transactional, so a rolled-back call leaves no gap. Starts
   *   from 1 -- switching an existing deployment over would reissue numbers.
   */
  sequenceStorage?: WmsSequenceStorage;
  /**
   * Create the default loader type, location and loader at startup (default
   * `true`). The seed is idempotent and safe for several instances starting
   * at once. Set `false` when the host seeds them itself; the defaults must
   * then exist before the first stock movement, and startup fails if they do
   * not.
   */
  seedDefaults?: boolean;
  /**
   * The prefix this deployment expects its tables to carry. Optional and
   * purely a check: the prefix itself is applied by `withWmsTablePrefix`
   * before the `DataSource` initialises, which this module cannot do because
   * its options resolve too late. When set, startup fails if the tables did not
   * end up with it -- the symptom of forgetting `withWmsTablePrefix` on the
   * runtime `DataSource`.
   */
  tablePrefix?: string;
}

export type WmsSequenceStorage = 'sequence' | 'table';

export type WmsModuleCoreModuleAsyncOptions = WMSBaseModuleAsyncOptions &
  WmsModuleCoreModuleOptions;
