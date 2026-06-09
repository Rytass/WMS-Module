import type { ExecutionContext } from '@nestjs/common';
import type { ChangeType } from '../constants/stock-status';

/**
 * Host-neutral event/hook contracts for WMS mutations.
 *
 * Two tiers of events:
 * - **Operation events** (`<domain>.<past-tense-action>`): exactly one per root
 *   mutation, emitted by the GraphQL interceptor after the handler resolves
 *   (post-commit) carrying the operation result.
 * - **Stock domain events** (`stock.<change-type>`): driven by the `ChangeType`
 *   state machine, collected inside core services (possibly many per operation)
 *   and flushed post-commit.
 *
 * The library never knows what a consumer does with these — it only declares the
 * names and payloads. Wiring is opt-in via `forRootAsync({ beforeHooks,
 * afterListeners })`; when nothing is configured the whole chain is inert.
 */

// --- Operation event names (one per root mutation) ------------------------

export type WmsOperationEventName =
  | 'receive-inventory-order.created'
  | 'receive-inventory-order.updated'
  | 'receive-inventory-order.received'
  | 'ship-inventory-order.created'
  | 'ship-inventory-order.updated'
  | 'ship-inventory-order.shipped'
  | 'ship-inventory-order.ship-cancelled'
  | 'transfer-order.created'
  | 'transfer-order.updated'
  | 'transfer-order.transferred'
  | 'transfer-order.transfer-cancelled'
  | 'hold-inventory-order.created'
  | 'hold-inventory-order.updated'
  | 'hold-inventory-order.released'
  | 'allocate-inventory-order.created'
  | 'allocate-inventory-order.updated'
  | 'allocate-inventory-order.deallocated'
  | 'transfer-vendor-order.created'
  | 'transfer-vendor-order.updated'
  | 'transfer-vendor-order.returned'
  | 'transfer-customer-order.created'
  | 'transfer-customer-order.updated'
  | 'transfer-customer-order.returned'
  | 'quality-inspection-order.inspected'
  | 'scrape-order.scraped'
  | 'reclassify-inventory-order.reclassified'
  | 'batch.merged'
  | 'batch.splitted'
  | 'material.created'
  | 'material.updated'
  | 'loader.created'
  | 'loader.batch-created'
  | 'loader.updated'
  | 'loader.type-created'
  | 'loader.type-updated'
  | 'location.created'
  | 'location.updated'
  | 'warehouse-map.updated';

// --- Stock domain event names (driven by ChangeType) ----------------------

export type WmsStockEventName =
  | 'stock.received'
  | 'stock.in-shipment'
  | 'stock.shipped'
  | 'stock.in-transfer'
  | 'stock.transferred'
  | 'stock.vendor-transferred'
  | 'stock.vendor-returned'
  | 'stock.held'
  | 'stock.released'
  | 'stock.customer-held'
  | 'stock.customer-returned'
  | 'stock.splitted'
  | 'stock.merged'
  | 'stock.allocated'
  | 'stock.deallocated'
  | 'stock.reclassified'
  | 'stock.scraped'
  // No dedicated ChangeType — quality inspection only flips the
  // inspectionResult flag; surfaced as its own event to fill the gap.
  | 'stock.inspection-resolved';

export type WmsEventName = WmsOperationEventName | WmsStockEventName;

// --- Payloads -------------------------------------------------------------

/**
 * Payload for an operation event. `id` is the primary key of the operation's
 * main entity/order (correlation id shared with the stock events it fans out
 * to); `result` is the mutation's return value (a DTO, or `boolean` for action
 * mutations).
 */
export interface WmsOperationEventPayload<TResult = unknown> {
  readonly id: string | null;
  readonly result: TResult;
}

/**
 * Payload for a stock domain event, built from the inserted `*_order_change`
 * row. These four fields are reliably available the moment the change is
 * written (no extra query). For richer batch/material/location details a
 * listener can look them up by `orderId` / `itemId` after commit.
 */
export interface WmsStockEventPayload {
  /** Base order id (`change.id`) — correlation id shared with the operation event. */
  readonly orderId: string;
  /** The order item this change applies to (`change.itemId`). */
  readonly itemId: string;
  /** `change.quantityChanged` — sign carries direction (in: +, out: -). */
  readonly quantityDelta: number;
  /** The resolved `ChangeType` for this stock movement (null for inspection). */
  readonly changeType: ChangeType | null;
  /** Quality-inspection result, present only on `stock.inspection-resolved`. */
  readonly inspectionResult?: boolean | null;
}

/** Maps every event name to its payload type. */
export type WmsEventPayloadMap = {
  readonly [N in WmsOperationEventName]: WmsOperationEventPayload;
} & {
  readonly [N in WmsStockEventName]: WmsStockEventPayload;
};

/** A collected domain event: a name plus its typed payload. */
export interface WmsDomainEvent<N extends WmsEventName = WmsEventName> {
  readonly name: N;
  readonly payload: WmsEventPayloadMap[N];
}

// --- Hook / listener contracts -------------------------------------------

/**
 * Context handed to a before-hook. Runs *before* any DB work, so it sees the
 * mutation **intent** (raw GraphQL arguments) rather than a result. Throwing
 * vetoes the whole mutation with zero side effects.
 */
export interface WmsBeforeHookContext<N extends WmsEventName = WmsEventName> {
  readonly event: N;
  readonly args: Readonly<Record<string, unknown>>;
  readonly executionContext: ExecutionContext;
}

/** Context handed to an after-listener. Runs post-commit with the event payload. */
export interface WmsAfterEventContext<N extends WmsEventName = WmsEventName> {
  readonly event: N;
  readonly payload: WmsEventPayloadMap[N];
}

export type WmsBeforeHook<N extends WmsEventName = WmsEventName> = (
  context: WmsBeforeHookContext<N>,
) => void | Promise<void>;

export type WmsAfterListener<N extends WmsEventName = WmsEventName> = (
  context: WmsAfterEventContext<N>,
) => void | Promise<void>;

export type WmsBeforeHookMap = {
  readonly [N in WmsEventName]?: WmsBeforeHook<N>;
};

export type WmsAfterListenerMap = {
  readonly [N in WmsEventName]?: WmsAfterListener<N>;
};

/**
 * Event options merged into the module options. All optional — omit everything
 * to keep the module inert (pre-event behaviour).
 */
export interface WmsEventModuleOptions {
  readonly beforeHooks?: WmsBeforeHookMap;
  readonly afterListeners?: WmsAfterListenerMap;
}

/**
 * Runtime bridge to an external emitter (e.g. `@nestjs/event-emitter`). The
 * graphql package provides an implementation; when absent, dispatch simply
 * skips it.
 */
export interface WmsEventEmitterBridge {
  forward(event: WmsDomainEvent): void;
}
