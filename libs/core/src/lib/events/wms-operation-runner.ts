import { type ExecutionContext, Injectable } from '@nestjs/common';
import { collectToScope, runInDispatchScope } from './dispatch-scope';
import { WmsEventDispatcher } from './wms-event.dispatcher';
import type {
  WmsActor,
  WmsDomainEvent,
  WmsOperationEventName,
} from './wms-event.types';

/**
 * Derive the operation event's correlation id from whatever the operation
 * returned, falling back to an `id` argument. Action operations that return a
 * bare `boolean` land on the argument.
 */
const defaultResolveId = (
  result: unknown,
  args: Readonly<Record<string, unknown>>,
): string | null => {
  if (
    result &&
    typeof result === 'object' &&
    'id' in result &&
    typeof (result as { id: unknown }).id === 'string'
  ) {
    return (result as { id: string }).id;
  }

  const argId = args['id'];

  return typeof argId === 'string' ? argId : null;
};

export interface WmsOperationRunOptions {
  /**
   * The operation event to emit once the operation resolves. Omit to open a
   * dispatch scope without an operation event — the shape a host wants when it
   * calls a domain service directly and only cares that the `stock.*` events
   * that service collects are flushed.
   */
  readonly event?: WmsOperationEventName;
  /** The operation's intent, handed to the before-hook and the event payload. */
  readonly args?: Readonly<Record<string, unknown>>;
  /** Who performed it. `null` when the host does not track an actor. */
  readonly actor?: WmsActor | null;
  /** Override how the event's correlation id is derived from the result. */
  readonly resolveId?: (
    result: unknown,
    args: Readonly<Record<string, unknown>>,
  ) => string | null;
  /**
   * The NestJS execution context, when there is one. `null` for a host calling
   * a service directly — which is why {@link WmsBeforeHookContext} declares it
   * nullable.
   */
  readonly executionContext?: ExecutionContext | null;
}

/**
 * Runs one WMS operation with the full event guarantee, from any caller.
 *
 * The four steps — before-hook (a throw vetoes, before any DB work), the
 * operation itself, the operation event, and a single post-commit flush of
 * everything the services collected on the way — used to live inside
 * `WmsMutationInterceptor`, which meant they only happened for callers coming
 * in through GraphQL. A host driving the warehouse from its own code path got
 * no hooks, no actor and no events: `StockChangeSubscriber` still collected
 * them, but with no scope open there was nothing to collect into and nobody to
 * flush.
 *
 * That is the case that matters. A host with its own inbound flow calls the
 * domain services directly, and `InventoryCountLockSubscriber` already goes out
 * of its way to cover exactly that caller.
 *
 * The interceptor now delegates here, so the two paths cannot drift.
 *
 * ```ts
 * await runner.run(
 *   { event: 'transfer-order.transferred', args: { orderId }, actor },
 *   () => transferOrderService.transfer(orderId),
 * );
 * ```
 *
 * Nesting is safe: an inner call joins the outer scope and only the outermost
 * one flushes, so a host may wrap a service that itself runs operations.
 */
@Injectable()
export class WmsOperationRunner {
  constructor(private readonly dispatcher: WmsEventDispatcher) {}

  async run<T>(
    options: WmsOperationRunOptions,
    operation: () => Promise<T>,
  ): Promise<T> {
    // Nothing wired: run the operation and skip the machinery entirely, the way
    // the interceptor always has. `collectToScope` is already a no-op outside a
    // scope, so the services behave identically.
    if (!this.dispatcher.isActive()) {
      return operation();
    }

    const args = options.args ?? {};
    const actor = options.actor ?? null;

    if (options.event) {
      // Before any DB work, so a throw vetoes with zero side effects.
      await this.dispatcher.runBeforeHook({
        event: options.event,
        args,
        executionContext: options.executionContext ?? null,
        source: options.executionContext ? 'graphql' : 'host',
        actor,
      });
    }

    const { result, events } = await runInDispatchScope(async () => {
      const operationResult = await operation();

      if (options.event) {
        const resolveId = options.resolveId ?? defaultResolveId;

        const operationEvent: WmsDomainEvent<WmsOperationEventName> = {
          name: options.event,
          payload: {
            id: resolveId(operationResult, args),
            result: operationResult,
            args,
            actor,
          },
        };

        collectToScope(operationEvent);
      }

      return operationResult;
    });

    if (events) {
      await this.dispatcher.flush(events);
    }

    return result;
  }
}
