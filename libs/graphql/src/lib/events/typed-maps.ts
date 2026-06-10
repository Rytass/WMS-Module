/**
 * @file typed-maps.ts
 * Consumer-facing typed hook/listener maps for the WMS mutation event system.
 *
 * These types give consumers per-event type safety when wiring `beforeHooks`
 * and `afterListeners` in `WmsModuleGraphqlModule.forRootAsync(...)`.  They
 * layer on top of the runtime-erased core contracts without introducing any
 * runtime dependency — everything here is `import type` only.
 *
 * Key exports
 * -----------
 * - {@link WmsEventPayloadFor}      — resolves the payload type for a given event name
 * - {@link WmsTypedAfterEventContext}   — ctx passed to after-listeners
 * - {@link WmsTypedBeforeHookContext}   — ctx passed to before-hooks (pre-DB)
 * - {@link WmsTypedAfterListenerMap}   — `afterListeners` option with typed callbacks
 * - {@link WmsTypedBeforeHookMap}      — `beforeHooks` option with typed callbacks
 */
import type {
  WmsActor,
  WmsEventName,
  WmsOperationEventName,
  WmsOperationEventPayload,
  WmsStockEventPayload,
} from '@rytass/wms-module-core';
import type { ExecutionContext } from '@nestjs/common';
import type { WmsOperationResultMap } from './operation-result-map';

// ---------------------------------------------------------------------------
// Payload resolution
// ---------------------------------------------------------------------------

/**
 * Resolves the full event payload type for a given {@link WmsEventName}.
 *
 * - Operation events (`WmsOperationEventName`): `WmsOperationEventPayload`
 *   parameterised with the concrete result type from {@link WmsOperationResultMap}.
 * - Stock events (`WmsStockEventName`): `WmsStockEventPayload` (ids-only by
 *   default; enriched when `enrichStockEvents: true`).
 */
export type WmsEventPayloadFor<N extends WmsEventName> =
  N extends WmsOperationEventName
    ? WmsOperationEventPayload<WmsOperationResultMap[N]>
    : WmsStockEventPayload;

// ---------------------------------------------------------------------------
// Context shapes
// ---------------------------------------------------------------------------

/**
 * Context passed to an after-listener.  Runs post-commit with the full
 * typed event payload.
 */
export interface WmsTypedAfterEventContext<N extends WmsEventName> {
  readonly event: N;
  readonly payload: WmsEventPayloadFor<N>;
}

/**
 * Context passed to a before-hook.  Runs *before* any DB work, so
 * `payload` / `result` are not yet available — only the raw GraphQL
 * arguments (`args`) and the resolved actor.  Throwing from a before-hook
 * vetoes the mutation with zero side effects.
 */
export interface WmsTypedBeforeHookContext<N extends WmsEventName> {
  readonly event: N;
  /** Raw GraphQL arguments — the mutation intent (per §3.4 of the design doc). */
  readonly args: Readonly<Record<string, unknown>>;
  /** The NestJS execution context at the time of the mutation call. */
  readonly executionContext: ExecutionContext;
  /** Who performed the mutation; `null` when no `actorExtractor` is configured. */
  readonly actor: WmsActor | null;
}

// ---------------------------------------------------------------------------
// Hook / listener map types (consumer-facing options)
// ---------------------------------------------------------------------------

/**
 * Typed `afterListeners` map.  Each key is an optional per-event callback
 * that receives a fully typed {@link WmsTypedAfterEventContext}.
 *
 * Pass an instance of this type as `afterListeners` in
 * `WmsModuleGraphqlModule.forRootAsync(...)` to get per-event type safety.
 */
export type WmsTypedAfterListenerMap = {
  readonly [N in WmsEventName]?: (
    ctx: WmsTypedAfterEventContext<N>,
  ) => void | Promise<void>;
};

/**
 * Typed `beforeHooks` map.  Each key is an optional per-event callback
 * that receives a fully typed {@link WmsTypedBeforeHookContext}.
 *
 * Throwing inside a before-hook vetoes the mutation before any transaction
 * is opened.  Pass an instance of this type as `beforeHooks` in
 * `WmsModuleGraphqlModule.forRootAsync(...)`.
 */
export type WmsTypedBeforeHookMap = {
  readonly [N in WmsEventName]?: (
    ctx: WmsTypedBeforeHookContext<N>,
  ) => void | Promise<void>;
};
