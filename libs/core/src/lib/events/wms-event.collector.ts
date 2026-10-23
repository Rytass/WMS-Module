import { Injectable } from '@nestjs/common';
import { collectToScope } from './dispatch-scope';
import type {
  WmsDomainEvent,
  WmsEventName,
  WmsEventPayloadMap,
} from './wms-event.types';

/**
 * Injected into core services so they can record stock domain events at the
 * point a `*_order_change` / state transition is written. Events are buffered
 * in the current dispatch scope and flushed post-commit by the graphql
 * interceptor. Outside a scope (the service called directly as a plain library)
 * this is a silent no-op.
 */
@Injectable()
export class WmsEventCollector {
  collect<N extends WmsEventName>(
    name: N,
    payload: WmsEventPayloadMap[N],
  ): void {
    const event: WmsDomainEvent<N> = { name, payload };
    collectToScope(event);
  }
}
