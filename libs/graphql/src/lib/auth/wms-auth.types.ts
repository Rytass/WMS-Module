import type { ExecutionContext } from '@nestjs/common';

/**
 * A single, host-neutral permission requirement attached to a WMS root
 * operation. `resource` and `action` are plain strings on purpose — the WMS
 * library never knows (nor cares) how a consumer maps them onto Casbin, RBAC
 * tiers, JWT scopes or anything else. The mapping lives entirely in the
 * consumer-supplied {@link WmsAuthChecker}.
 */
export interface WmsOperationRequirement {
  readonly resource: string;
  readonly action: string;
}

/**
 * The authorization contract a consumer wires into
 * `WmsModuleGraphqlModule.forRootAsync({ authChecker })`. It receives the live
 * NestJS {@link ExecutionContext} (so the consumer can reach the request,
 * GraphQL context, current member, enforcer, etc.) plus the requirement
 * declared by `@WmsOperation` on the resolver being invoked.
 *
 * Return `true` to allow, `false` to deny. Throwing is also fine — the
 * exception propagates exactly like any guard rejection.
 */
export type WmsAuthChecker = (
  context: ExecutionContext,
  requirement: WmsOperationRequirement,
) => boolean | Promise<boolean>;

/**
 * Options accepted by `WmsModuleGraphqlModule.forRootAsync` that govern
 * authorization. Intentionally optional: when `authChecker` is omitted the
 * module stays fully permissive, preserving the pre-auth release behaviour for
 * local development and consumers that handle authorization elsewhere.
 */
export interface WmsAuthModuleOptions {
  readonly authChecker?: WmsAuthChecker;
}

/** DI token holding the resolved {@link WmsAuthModuleOptions}. */
export const WMS_AUTH_OPTIONS = Symbol('WMS_AUTH_OPTIONS');

/** Reflector metadata key carrying the {@link WmsOperationRequirement}. */
export const WMS_OPERATION_METADATA = 'wms:operation';
