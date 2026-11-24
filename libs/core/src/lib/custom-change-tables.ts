import { OWNED_CHANGE_TABLES } from './events/stock-change.subscriber';
import type { WmsCustomChangeTable } from './typings/custom-change-table';

/**
 * Reject a registration that would shadow one of this package's own change
 * tables.
 *
 * Silently letting a host redefine `receive_inventory_order_changes` would
 * reclassify every receipt in the warehouse from somewhere the reader of that
 * report would never think to look. Refusing at module-definition time costs a
 * startup crash and buys an obvious one.
 *
 * The list is derived from `StockChangeSubscriber`'s own table map rather than
 * restated here: two hand-maintained copies would drift, and the drift would
 * open exactly the hole this guard exists to close.
 */
export const assertCustomChangeTables = (
  tables: readonly WmsCustomChangeTable[] | undefined,
): readonly WmsCustomChangeTable[] => {
  if (!tables?.length) return [];

  const seen = new Set<string>();

  for (const { table } of tables) {
    if (OWNED_CHANGE_TABLES.has(table)) {
      throw new Error(
        `WmsModuleCoreModule: customChangeTables cannot register "${table}" — this package owns it.`,
      );
    }

    if (seen.has(table)) {
      throw new Error(
        `WmsModuleCoreModule: customChangeTables registers "${table}" twice.`,
      );
    }

    if (!table.endsWith('_order_changes')) {
      // The inventory count lock keys off this suffix, so a table without it
      // gets events but silently escapes the lock — the worse half of the
      // bargain, and not one a host would knowingly take.
      throw new Error(
        `WmsModuleCoreModule: customChangeTables entry "${table}" must end in "_order_changes" so the inventory count lock covers it too.`,
      );
    }

    seen.add(table);
  }

  return tables;
};
