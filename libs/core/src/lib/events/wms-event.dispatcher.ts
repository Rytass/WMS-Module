import { Inject, Injectable, Optional, Logger } from '@nestjs/common';
import {
  WMS_EVENT_EMITTER_BRIDGE,
  WMS_EVENT_OPTIONS,
} from './wms-event.tokens';
import type {
  WmsAfterListener,
  WmsBeforeHook,
  WmsBeforeHookContext,
  WmsDomainEvent,
  WmsEventEmitterBridge,
  WmsEventModuleOptions,
} from './wms-event.types';

/**
 * Central event dispatcher. Runs consumer before-hooks (which may veto) and,
 * post-commit, flushes collected events to consumer after-listeners and the
 * optional emitter bridge. Listener errors are isolated so one failing listener
 * never blocks the others or the already-committed mutation.
 */
@Injectable()
export class WmsEventDispatcher {
  private readonly logger = new Logger(WmsEventDispatcher.name);

  constructor(
    @Inject(WMS_EVENT_OPTIONS)
    private readonly options: WmsEventModuleOptions,
    @Optional()
    @Inject(WMS_EVENT_EMITTER_BRIDGE)
    private readonly bridge: WmsEventEmitterBridge | null = null,
  ) {}

  /** Whether any hook, listener or bridge is wired (lets the interceptor skip overhead entirely). */
  isActive(): boolean {
    const { beforeHooks, afterListeners } = this.options;
    return (
      !!this.bridge ||
      (!!beforeHooks && Object.keys(beforeHooks).length > 0) ||
      (!!afterListeners && Object.keys(afterListeners).length > 0)
    );
  }

  /** Invoke the before-hook for an event. A thrown error vetoes the mutation. */
  async runBeforeHook(context: WmsBeforeHookContext): Promise<void> {
    const hook = this.options.beforeHooks?.[context.event] as
      | WmsBeforeHook
      | undefined;

    if (hook) {
      await hook(context);
    }
  }

  /** Flush collected events to after-listeners and the emitter bridge (post-commit). */
  async flush(events: readonly WmsDomainEvent[]): Promise<void> {
    for (const event of events) {
      const listener = this.options.afterListeners?.[event.name] as
        | WmsAfterListener
        | undefined;

      if (listener) {
        try {
          await listener({ event: event.name, payload: event.payload });
        } catch (error) {
          this.logger.error(
            `WMS after-listener for "${event.name}" threw: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }

      try {
        this.bridge?.forward(event);
      } catch (error) {
        this.logger.error(
          `WMS emitter bridge for "${event.name}" threw: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }
}
