import {
  type CallHandler,
  type ExecutionContext,
  Inject,
  Injectable,
  type NestInterceptor,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import {
  WMS_ACTOR_EXTRACTOR,
  WmsOperationRunner,
  type WmsActor,
  type WmsActorExtractor,
} from '@rytass/wms-module-core';
import { type Observable, firstValueFrom, of } from 'rxjs';
import {
  WMS_MUTATION_EVENT_METADATA,
  type WmsMutationEventConfig,
} from './wms-mutation-event.constants';

/**
 * Hands each `@WmsMutationEvent` mutation to {@link WmsOperationRunner}, which
 * owns the before-hook / dispatch scope / post-commit flush sequence.
 *
 * All this adds on top is what only a GraphQL request can supply: the raw
 * arguments and the actor. Keeping the sequence itself in core is what stops
 * the GraphQL path and a host's direct service call from drifting apart.
 *
 * When no hook, listener or bridge is configured the runner passes through
 * untouched.
 */
@Injectable()
export class WmsMutationInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly runner: WmsOperationRunner,
    @Optional()
    @Inject(WMS_ACTOR_EXTRACTOR)
    private readonly actorExtractor: WmsActorExtractor | null = null,
  ) {}

  private resolveActor(context: ExecutionContext): WmsActor | null {
    if (!this.actorExtractor) {
      return null;
    }

    try {
      return this.actorExtractor(context);
    } catch {
      // Fail-open on actor resolution: never break a mutation over audit metadata.
      return null;
    }
  }

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const config = this.reflector.get<WmsMutationEventConfig | undefined>(
      WMS_MUTATION_EVENT_METADATA,
      context.getHandler(),
    );

    if (!config) {
      return next.handle();
    }

    const result = await this.runner.run(
      {
        event: config.event,
        args:
          GqlExecutionContext.create(context).getArgs<
            Record<string, unknown>
          >() ?? {},
        actor: this.resolveActor(context),
        resolveId: config.resolveId,
        executionContext: context,
      },
      () => firstValueFrom(next.handle()),
    );

    return of(result);
  }
}
