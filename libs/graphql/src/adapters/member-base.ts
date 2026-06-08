import type { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type {
  WmsAuthChecker,
  WmsOperationRequirement,
} from '../lib/auth';

/**
 * A Casbin `[subject, action]` tuple, e.g. `['wms:material', 'read']`.
 */
export type CasbinAction = [string, string];

/**
 * The shape of the JWT payload `@rytass/member-base-nestjs-module`'s
 * `CasbinGuard` verifies and attaches to the request. We only depend on its
 * runtime contract — there is no compile-time import of member-base, so it
 * stays an entirely optional integration.
 */
interface MemberBasePayload {
  readonly id: string;
  readonly domain?: string;
}

/**
 * The request object after member-base's global `CasbinGuard` has run. The
 * guard populates these three fields *before* it defers on our
 * `IS_ROUTE_PUBLIC` marker, so by the time {@link WmsAuthGuard} executes they
 * are guaranteed to be present (when a valid token was supplied).
 */
interface MemberBaseEnrichedRequest {
  readonly payload?: MemberBasePayload;
  readonly enforcer?: unknown;
  readonly casbinPermissionChecker?: (params: {
    readonly enforcer: unknown;
    readonly payload: MemberBasePayload;
    readonly actions: CasbinAction[];
  }) => Promise<boolean>;
}

export interface MemberBaseWmsAuthCheckerOptions {
  /**
   * Map a host-neutral WMS requirement onto one or more Casbin
   * `[subject, action]` tuples. This is where your project's permission naming
   * convention lives. Returning several tuples means "allow if *any* passes"
   * (member-base's default checker is OR-based).
   *
   * @example
   * ```ts
   * map: ({ resource, action }) => [[`wms:${resource}`, action]]
   * // material:read  ->  enforce(memberId, domain, 'wms:material', 'read')
   * ```
   */
  readonly map: (requirement: WmsOperationRequirement) => CasbinAction[];
}

const extractRequest = (
  context: ExecutionContext,
): MemberBaseEnrichedRequest | undefined => {
  const gqlContext = GqlExecutionContext.create(context).getContext<{
    readonly req?: MemberBaseEnrichedRequest;
  }>();

  return gqlContext?.req;
};

/**
 * Builds a {@link WmsAuthChecker} that authorizes WMS operations against
 * `@rytass/member-base-nestjs-module`'s Casbin setup.
 *
 * It reuses everything the host's global `CasbinGuard` already prepared on the
 * request — the verified `payload`, the `enforcer`, and even the consumer's
 * (possibly customized) `casbinPermissionChecker`. WMS therefore enforces with
 * the *exact same* policy engine and rules as the host's own resolvers, with no
 * member-base import on the WMS side.
 *
 * Prerequisite: register `MemberBaseModule` with its global guard enabled
 * (the default), and expose the request on the GraphQL context as `req`
 * (Apollo's default).
 */
export const createMemberBaseWmsAuthChecker = (
  options: MemberBaseWmsAuthCheckerOptions,
): WmsAuthChecker => {
  return async (context, requirement): Promise<boolean> => {
    const request = extractRequest(context);

    // No verified member → unauthenticated. CasbinGuard sets `payload` to
    // undefined when the token is missing or invalid.
    if (!request?.payload) {
      return false;
    }

    // The enforcer / checker are injected by CasbinGuard. Their absence means
    // the host did not enable the global guard — fail closed rather than
    // silently allowing everything.
    if (!request.enforcer || !request.casbinPermissionChecker) {
      return false;
    }

    const actions = options.map(requirement);

    if (actions.length === 0) {
      return false;
    }

    return request.casbinPermissionChecker({
      enforcer: request.enforcer,
      payload: request.payload,
      actions,
    });
  };
};
