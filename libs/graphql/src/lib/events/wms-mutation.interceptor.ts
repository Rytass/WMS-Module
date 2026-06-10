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
  collectToScope,
  runInDispatchScope,
  WMS_ACTOR_EXTRACTOR,
  WmsEventDispatcher,
  type WmsActor,
  type WmsActorExtractor,
  type WmsDomainEvent,
  type WmsOperationEventName,
} from '@rytass/wms-module-core';
import { type Observable, firstValueFrom, of } from 'rxjs';
import {
  WMS_MUTATION_EVENT_METADATA,
  type WmsMutationEventConfig,
} from './wms-mutation-event.constants';

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

/**
 * Wraps each `@WmsMutationEvent` mutation in a dispatch scope:
 * 1. runs the before-hook (throw -> veto, before any transaction);
 * 2. executes the resolver (services collect stock events into the scope);
 * 3. emits the operation event after the handler resolves (post-commit);
 * 4. flushes the whole buffer to after-listeners + emitter bridge.
 *
 * When no hook/listener/bridge is configured it passes through untouched.
 */
@Injectable()
export class WmsMutationInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly dispatcher: WmsEventDispatcher,
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

    if (!config || !this.dispatcher.isActive()) {
      return next.handle();
    }

    const args =
      GqlExecutionContext.create(context).getArgs<Record<string, unknown>>() ??
      {};
    const actor = this.resolveActor(context);

    // Before-hook runs before any DB work; a throw vetoes with zero side effects.
    await this.dispatcher.runBeforeHook({
      event: config.event,
      args,
      executionContext: context,
      actor,
    });

    const { result, events } = await runInDispatchScope(async () => {
      const handlerResult = await firstValueFrom(next.handle());

      const id = config.resolveId
        ? config.resolveId(handlerResult, args)
        : defaultResolveId(handlerResult, args);

      const operationEvent: WmsDomainEvent<WmsOperationEventName> = {
        name: config.event,
        payload: { id, result: handlerResult, args, actor },
      };
      collectToScope(operationEvent);

      return handlerResult;
    });

    if (events) {
      await this.dispatcher.flush(events);
    }

    return of(result);
  }
}
