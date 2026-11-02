import {
  BatchEntity as BaseBatchEntity,
  LocationEntity as BaseLocationEntity,
  MaterialEntity as BaseMaterialEntity,
  OrderEntity as BaseOrderEntity,
  StockEntity as BaseStockEntity,
} from '@rytass/wms-base-nestjs-module';
import { WarehouseMapEntity as BaseWarehouseMapEntity } from '@rytass/wms-base-nestjs-module/models/warehouse-map.entity';
import { getMetadataArgsStorage } from 'typeorm';
import { WMS_MODULE_ENTITY_CLASSES } from '../models/models.module';
import {
  getWmsTablePrefix,
  readWmsTablePrefixState,
  wmsLogicalTableName,
  writeWmsTablePrefixState,
} from './logical-table-name';

/**
 * A table-name prefix for every table this package and
 * `@rytass/wms-base-nestjs-module` declare — and for nothing else.
 *
 * ## How it takes effect
 *
 * TypeORM reads an entity's table name from the decorator's metadata args when
 * a `DataSource` builds its metadata, not when the decorator runs. So the
 * prefix does not have to exist at decoration time (no env var read during
 * `import`, no import-order trap): it has to exist **before the first
 * `DataSource` initialises**. `withWmsTablePrefix` rewrites the args in place:
 *
 * - the table name of each of our entity classes, matched by **class
 *   identity**. A host entity named `LocationEntity` on a table `locations` —
 *   exactly what base declares — is a different class and is not touched;
 * - the string target of each relation declared on one of our classes
 *   (`@ManyToOne('locations')` becomes `'wms_locations'`). TypeORM resolves a
 *   string target by `givenTableName`, so without this a host's own
 *   `@Entity('locations')` could capture our relations;
 * - any explicitly named index, unique, check, exclusion or foreign key on our
 *   classes. (None are named today; every constraint name is derived from the
 *   table name and follows it automatically.)
 *
 * The host's `namingStrategy` is not touched, so every name it derives for its
 * own entities is byte-for-byte what it was.
 *
 * A host `@ChildEntity()` of one of our roots shares the root's table, so it
 * lands under the prefix without being listed.
 *
 * ## Scope
 *
 * TypeORM's metadata args storage is **process-global**: every `DataSource` in
 * the process sees the prefixed names. Applying is idempotent for the same
 * prefix and throws for a different one. A process that builds its
 * `DataSource` elsewhere (the TypeORM migration CLI loading a standalone
 * `data-source.ts`) must call it there too — `withWmsTablePrefix(options,
 * prefix)` is shaped to wrap both option objects.
 *
 * ## Database objects that are not tables
 *
 * Order-key and loader-serial sequences take the same prefix (see
 * `WmsSequenceService`). Raw SQL in this package reads table paths from entity
 * metadata, never from string literals.
 */

const PREFIX_PATTERN = /^[a-z][a-z0-9_]*$/;

/**
 * Our six base roots plus every class `ModelsModule` registers. Identity, not
 * names: this is the whole point.
 */
const ownedEntityClasses = (): ReadonlySet<unknown> =>
  new Set<unknown>([
    BaseBatchEntity,
    BaseLocationEntity,
    BaseMaterialEntity,
    BaseOrderEntity,
    BaseStockEntity,
    BaseWarehouseMapEntity,
    ...WMS_MODULE_ENTITY_CLASSES,
  ]);

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

interface NamedArgs {
  readonly target: unknown;
  readonly name?: string;
}

/**
 * Apply `prefix` to every table this package owns. See the module comment.
 *
 * @throws when called again with a different prefix, or with a prefix that is
 * not a plain lower-case SQL identifier fragment.
 */
export const applyWmsTablePrefix = (prefix: string): void => {
  const state = readWmsTablePrefixState();

  if (state) {
    if (state.prefix === prefix) return;

    throw new Error(
      `withWmsTablePrefix: the prefix is already "${state.prefix}" in this process and cannot become "${prefix}". TypeORM's metadata storage is process-global, so every DataSource in one process shares one prefix.`,
    );
  }

  if (prefix !== '' && !PREFIX_PATTERN.test(prefix)) {
    throw new Error(
      `withWmsTablePrefix: "${prefix}" is not a usable prefix; use lower-case letters, digits and underscores, starting with a letter (e.g. "wms_").`,
    );
  }

  const owned = ownedEntityClasses();
  const storage = getMetadataArgsStorage();
  const logicalNames = new Map<string, string>();

  if (prefix !== '') {
    const ownedTableNames = new Set(
      storage.tables
        .filter((table) => owned.has(table.target) && table.name)
        .map((table) => table.name as string),
    );

    storage.tables
      .filter((table) => owned.has(table.target) && table.name)
      .forEach((table) => {
        const logical = table.name as string;

        (table as Mutable<typeof table>).name = `${prefix}${logical}`;
        logicalNames.set(`${prefix}${logical}`, logical);
      });

    storage.relations
      .filter(
        (relation) =>
          owned.has(relation.target) &&
          typeof relation.type === 'string' &&
          ownedTableNames.has(relation.type),
      )
      .forEach((relation) => {
        (relation as Mutable<typeof relation>).type =
          `${prefix}${relation.type as string}`;
      });

    const namedConstraints: readonly (readonly NamedArgs[])[] = [
      storage.indices,
      storage.uniques,
      storage.checks,
      storage.exclusions,
      storage.foreignKeys,
    ];

    namedConstraints.forEach((list) =>
      list
        .filter((args) => owned.has(args.target) && args.name)
        .forEach((args) => {
          (args as Mutable<NamedArgs>).name = `${prefix}${args.name}`;
        }),
    );

    storage.joinColumns
      .filter(
        (joinColumn) =>
          owned.has(joinColumn.target) && joinColumn.foreignKeyConstraintName,
      )
      .forEach((joinColumn) => {
        (joinColumn as Mutable<typeof joinColumn>).foreignKeyConstraintName =
          `${prefix}${joinColumn.foreignKeyConstraintName}`;
      });
  }

  writeWmsTablePrefixState({ prefix, logicalNames });
};

/**
 * Apply the prefix and hand back the options unchanged, so one call wraps the
 * options of each `DataSource` a host builds:
 *
 * ```ts
 * TypeOrmModule.forRootAsync({ useFactory: () => withWmsTablePrefix({ ... }, 'wms_') })
 * export default new DataSource(withWmsTablePrefix({ ... }, 'wms_'));
 * ```
 */
export const withWmsTablePrefix = <T extends object>(
  options: T,
  prefix: string,
): T => {
  applyWmsTablePrefix(prefix);

  return options;
};

export { getWmsTablePrefix, wmsLogicalTableName };
