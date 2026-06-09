import { applyDecorators, SetMetadata, UseInterceptors } from '@nestjs/common';
import {
  WMS_MUTATION_EVENT_METADATA,
  type WmsMutationEventConfig,
} from './wms-mutation-event.constants';
import { WmsMutationInterceptor } from './wms-mutation.interceptor';

/**
 * Declares the operation event for a WMS root mutation and wires the
 * {@link WmsMutationInterceptor} that runs before-hooks (veto) and flushes
 * collected events post-commit. Apply alongside `@WmsOperation` on each mutation.
 *
 * @example
 * ```ts
 * @Mutation(() => ShipInventoryOrderDto)
 * @WmsOperation({ resource: 'ship-inventory-order', action: 'ship' })
 * @WmsMutationEvent({ event: 'ship-inventory-order.shipped' })
 * ship(@Args() args: ShipArgs): Promise<boolean> { ... }
 * ```
 */
export const WmsMutationEvent = (
  config: WmsMutationEventConfig,
): MethodDecorator =>
  applyDecorators(
    SetMetadata(WMS_MUTATION_EVENT_METADATA, config),
    UseInterceptors(WmsMutationInterceptor),
  );
