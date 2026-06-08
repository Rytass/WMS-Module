import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { HOST_SKIP_METADATA_KEY } from './host-skip.constant';
import { WmsAuthGuard } from './wms-auth.guard';
import {
  WMS_OPERATION_METADATA,
  type WmsOperationRequirement,
} from './wms-auth.types';

/**
 * Declares the permission requirement for a WMS root operation and wires up its
 * enforcement. Apply it to every `@Query` / `@Mutation` the library exposes.
 *
 * It bundles three concerns so a single annotation keeps a resolver
 * self-protecting and host-friendly:
 *
 * 1. {@link WMS_OPERATION_METADATA} — the host-neutral `{ resource, action }`
 *    that {@link WmsAuthGuard} hands to the consumer's `authChecker`.
 * 2. {@link HOST_SKIP_METADATA_KEY} — tells a host's global guard to defer (see
 *    that constant for the single coupling point with member-base).
 * 3. `@UseGuards(WmsAuthGuard)` — the route-level guard that performs the real
 *    authorization through the configured `authChecker`.
 *
 * @example
 * ```ts
 * @Query(() => MaterialDto)
 * @WmsOperation({ resource: 'material', action: 'read' })
 * material(@Args('id') id: string): Promise<MaterialDto> { ... }
 * ```
 */
export const WmsOperation = (
  requirement: WmsOperationRequirement,
): MethodDecorator =>
  applyDecorators(
    SetMetadata(WMS_OPERATION_METADATA, requirement),
    SetMetadata(HOST_SKIP_METADATA_KEY, true),
    UseGuards(WmsAuthGuard),
  );
