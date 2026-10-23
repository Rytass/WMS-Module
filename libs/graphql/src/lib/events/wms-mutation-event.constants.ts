import type { WmsOperationEventName } from '@rytass/wms-module-core';

/** Reflector metadata key carrying the {@link WmsMutationEventConfig}. */
export const WMS_MUTATION_EVENT_METADATA = 'wms:mutation-event';

export interface WmsMutationEventConfig {
  /** The operation event emitted for this mutation (post-commit). */
  readonly event: WmsOperationEventName;
  /**
   * Optional override for deriving the operation's primary id from the handler
   * result and/or arguments. Defaults to `result.id ?? args.id ?? null`.
   */
  readonly resolveId?: (
    result: unknown,
    args: Readonly<Record<string, unknown>>,
  ) => string | null;
}
