import { Type } from '@nestjs/common';
import {
  RESOLVER_NAME_METADATA,
  RESOLVER_TYPE_METADATA,
  TypeMetadataStorage,
} from '@nestjs/graphql';
import type { WmsOperationName } from '@rytass/wms-module-core';
import {
  WMS_OPERATION_METADATA,
  type WmsOperationRequirement,
} from '../auth/wms-auth.types';

/**
 * Deployment-level switches deciding which root operations get registered.
 *
 * `authChecker` and `beforeHooks` can already *refuse* an operation, but the
 * resolver stays in the compiled schema — so introspection, the consumer's
 * frontend codegen and any security audit still see a mutation that is
 * guaranteed to fail. These options remove it instead.
 */
export interface WmsOperationRegistrationOptions {
  /**
   * Allow-list of `${resource}:${action}` names. Only these are registered.
   * Mutually exclusive with {@link disabledOperations}.
   */
  readonly enabledOperations?: readonly WmsOperationName[];
  /** Deny-list of `${resource}:${action}` names. */
  readonly disabledOperations?: readonly WmsOperationName[];
  /**
   * Escape hatch by GraphQL field name, for when a requirement is too coarse.
   * Several queries share one requirement — `loader:read` alone covers 6 fields
   * — so disabling the name would take all of them. Name the field instead.
   */
  readonly disabledFields?: readonly string[];
}

/** What a pruning pass removed, keyed by root type. */
export interface PrunedOperations {
  readonly queries: readonly string[];
  readonly mutations: readonly string[];
}

/**
 * A resolver handler as reflected off a prototype. Typed loosely on purpose —
 * the only thing this module does with one is read metadata off it.
 */
type ResolverHandler = (...args: never[]) => unknown;

/** The `TypeMetadataStorage` surface this module drives. */
interface ResolverMetadataLike {
  readonly target: Type<unknown>;
  readonly methodName: string;
  readonly schemaName: string;
}

interface MetadataStorageLike {
  addQueryMetadata(metadata: ResolverMetadataLike): void;
  addMutationMetadata(metadata: ResolverMetadataLike): void;
}

export function resolveDisabled(options: WmsOperationRegistrationOptions): {
  readonly hasSwitches: boolean;
  readonly isOperationDisabled: (name: string) => boolean;
  readonly disabledFields: ReadonlySet<string>;
} {
  const { enabledOperations, disabledOperations, disabledFields } = options;

  if (enabledOperations && disabledOperations) {
    throw new Error(
      '[wms-module-graphql] `enabledOperations` and `disabledOperations` are mutually exclusive — pass one or the other, not both.',
    );
  }

  const enabled = enabledOperations ? new Set<string>(enabledOperations) : null;
  const disabled = disabledOperations
    ? new Set<string>(disabledOperations)
    : null;
  const fields = new Set<string>(disabledFields ?? []);

  return {
    hasSwitches: enabled !== null || disabled !== null || fields.size > 0,
    isOperationDisabled: (name: string): boolean => {
      if (enabled) {
        return !enabled.has(name);
      }

      if (disabled) {
        return disabled.has(name);
      }

      return false;
    },
    disabledFields: fields,
  };
}

/** Methods already pruned, so the metadata filter can drop their entries. */
const prunedMethods = new WeakMap<Type<unknown>, Set<string>>();

let metadataFilterInstalled = false;

/**
 * Stop the pruned operations from ever entering `TypeMetadataStorage`.
 *
 * The resolver metadata is **lazy**: `@Query()` / `@Mutation()` only register a
 * thunk with `LazyMetadataStorage`, and the thunk calls `add*Metadata` when
 * `GraphQLSchemaBuilder.build()` loads it. At `forRootAsync` time the storage
 * arrays are therefore still empty, and filtering them then would remove
 * nothing — so the filter has to sit on the writes instead.
 */
function installMetadataFilter(): void {
  if (metadataFilterInstalled) {
    return;
  }

  const storage = TypeMetadataStorage as unknown as MetadataStorageLike;
  const addQuery = storage.addQueryMetadata.bind(storage);
  const addMutation = storage.addMutationMetadata.bind(storage);

  const isPruned = (metadata: ResolverMetadataLike): boolean =>
    prunedMethods.get(metadata.target)?.has(metadata.methodName) === true;

  storage.addQueryMetadata = (metadata: ResolverMetadataLike): void => {
    if (isPruned(metadata)) {
      return;
    }

    addQuery(metadata);
  };

  storage.addMutationMetadata = (metadata: ResolverMetadataLike): void => {
    if (isPruned(metadata)) {
      return;
    }

    addMutation(metadata);
  };

  metadataFilterInstalled = true;
}

/** The GraphQL field name a root handler ends up under. */
function schemaNameOf(handler: ResolverHandler, methodName: string): string {
  const explicit = Reflect.getMetadata(RESOLVER_NAME_METADATA, handler) as
    | string
    | undefined;

  return explicit || methodName;
}

/**
 * Remove the switched-off root operations before the schema is built.
 *
 * Two edits are needed, at two different moments, and they must happen together:
 *
 * 1. **now** — `delete Resolver.prototype[method]`, because
 *    `ResolversExplorerService.explore()` walks the prototype with
 *    `MetadataScanner` and runs *before* the schema builder loads the lazy
 *    metadata. Leaving the method in place would put `Query.foo` in the resolver
 *    map with no matching field in the typeDefs, and `makeExecutableSchema`
 *    rejects the whole schema (`requireResolversToMatchSchema`).
 * 2. **at load time** — drop the metadata entry ({@link installMetadataFilter}),
 *    or the SDL would still declare a field that resolves to `null`: present,
 *    but dead.
 *
 * Deleting the prototype method does not disturb step 2's type reflection:
 * `design:returntype` is stored against the prototype and property key, not
 * against the function object, so it survives the delete.
 *
 * This runs synchronously from `forRootAsync`, i.e. while `AppModule` is still
 * being defined. Both the classes and the storage are process-global, so a
 * process may register `WmsModuleGraphqlModule` only once.
 */
export function pruneDisabledOperations(
  resolverClasses: readonly Type<unknown>[],
  options: WmsOperationRegistrationOptions,
): PrunedOperations {
  const { hasSwitches, isOperationDisabled, disabledFields } =
    resolveDisabled(options);

  if (!hasSwitches) {
    return { queries: [], mutations: [] };
  }

  installMetadataFilter();

  const queries: string[] = [];
  const mutations: string[] = [];

  for (const resolverClass of resolverClasses) {
    const prototype = resolverClass.prototype;

    if (!prototype) {
      continue;
    }

    for (const methodName of Object.getOwnPropertyNames(prototype)) {
      if (methodName === 'constructor') {
        continue;
      }

      const handler = prototype[methodName];

      if (typeof handler !== 'function') {
        continue;
      }

      const resolverType = Reflect.getMetadata(
        RESOLVER_TYPE_METADATA,
        handler,
      ) as string | undefined;

      // Only root operations are switchable. `@ResolveField` handlers are
      // reached exclusively through an already-registered root field, so
      // removing one would break the type rather than the deployment surface.
      if (resolverType !== 'Query' && resolverType !== 'Mutation') {
        continue;
      }

      const schemaName = schemaNameOf(handler, methodName);
      const requirement = Reflect.getMetadata(
        WMS_OPERATION_METADATA,
        handler,
      ) as WmsOperationRequirement | undefined;

      const disabled =
        disabledFields.has(schemaName) ||
        (requirement !== undefined &&
          isOperationDisabled(`${requirement.resource}:${requirement.action}`));

      if (!disabled) {
        continue;
      }

      const alreadyPruned =
        prunedMethods.get(resolverClass) ?? new Set<string>();

      alreadyPruned.add(methodName);
      prunedMethods.set(resolverClass, alreadyPruned);

      delete prototype[methodName];

      (resolverType === 'Query' ? queries : mutations).push(schemaName);
    }
  }

  return { queries, mutations };
}
