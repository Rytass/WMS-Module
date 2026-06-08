import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  WMS_AUTH_OPTIONS,
  WMS_OPERATION_METADATA,
  type WmsAuthModuleOptions,
  type WmsOperationRequirement,
} from './wms-auth.types';

/**
 * Route-level guard applied automatically by `@WmsOperation`. It reads the
 * requirement declared on the handler and delegates the allow/deny decision to
 * the consumer-supplied {@link WmsAuthModuleOptions.authChecker}.
 *
 * It is deliberately permissive in two cases:
 * - the handler carries no requirement (field resolvers reached only through an
 *   already-authorized root operation), and
 * - no `authChecker` was configured (local dev / auth handled elsewhere).
 */
@Injectable()
export class WmsAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(WMS_AUTH_OPTIONS)
    private readonly options: WmsAuthModuleOptions,
  ) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const requirement = this.reflector.get<WmsOperationRequirement | undefined>(
      WMS_OPERATION_METADATA,
      context.getHandler(),
    );

    if (!requirement) {
      return true;
    }

    const { authChecker } = this.options;

    if (!authChecker) {
      return true;
    }

    return authChecker(context, requirement);
  }
}
