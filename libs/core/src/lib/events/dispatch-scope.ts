import { AsyncLocalStorage } from 'node:async_hooks';
import type { WmsDomainEvent } from './wms-event.types';

interface DispatchScope {
  readonly buffer: WmsDomainEvent[];
}

/**
 * Process-wide async-context store that buffers domain events for the lifetime
 * of a single mutation. Propagates automatically across `await` boundaries
 * (resolver -> service -> cross-service) via the V8 async context, so services
 * collect into the same buffer without threading any context argument.
 */
const dispatchAls = new AsyncLocalStorage<DispatchScope>();

/** Push an event into the active scope. No-op when called outside a scope. */
export function collectToScope(event: WmsDomainEvent): void {
  dispatchAls.getStore()?.buffer.push(event);
}

export interface DispatchScopeResult<T> {
  readonly result: T;
  /**
   * The collected events when this call **owns** the outermost scope (caller
   * must flush them), or `null` when joining an existing outer scope (the outer
   * owner flushes).
   */
  readonly events: readonly WmsDomainEvent[] | null;
}

/**
 * Run `fn` inside a dispatch scope. If a scope already exists (nested mutation),
 * joins it and returns `events: null` so only the outermost owner flushes — this
 * guarantees a single post-commit flush after the outermost transaction.
 */
export async function runInDispatchScope<T>(
  fn: () => Promise<T>,
): Promise<DispatchScopeResult<T>> {
  if (dispatchAls.getStore()) {
    const result = await fn();
    return { result, events: null };
  }

  const scope: DispatchScope = { buffer: [] };
  const result = await dispatchAls.run(scope, fn);
  return { result, events: scope.buffer };
}
