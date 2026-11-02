/**
 * The process-global state `withWmsTablePrefix` leaves behind, and the two
 * readers everything else uses. Kept free of imports so a subscriber or a
 * service can read it without pulling in the entity registry.
 */

const STATE_KEY = Symbol.for('@rytass/wms-module-core/table-prefix');

export interface WmsTablePrefixState {
  readonly prefix: string;
  /** prefixed table name → the name the decorator declared */
  readonly logicalNames: ReadonlyMap<string, string>;
}

type GlobalWithState = typeof globalThis & {
  [STATE_KEY]?: WmsTablePrefixState;
};

export const readWmsTablePrefixState = (): WmsTablePrefixState | undefined =>
  (globalThis as GlobalWithState)[STATE_KEY];

export const writeWmsTablePrefixState = (state: WmsTablePrefixState): void => {
  (globalThis as GlobalWithState)[STATE_KEY] = state;
};

/** The prefix in effect in this process; `''` when none was applied. */
export const getWmsTablePrefix = (): string =>
  readWmsTablePrefixState()?.prefix ?? '';

/**
 * The name one of our tables was declared with, given the name it ended up
 * with — `wms_transfer_order_changes` → `transfer_order_changes`. Any table we
 * did not prefix (a host's own, or every table when there is no prefix) comes
 * back as it is.
 */
export const wmsLogicalTableName = (tableName: string): string =>
  readWmsTablePrefixState()?.logicalNames.get(tableName) ?? tableName;
