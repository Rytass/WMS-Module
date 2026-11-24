import { ConsumptionChangeKind } from './consumption-change-kind';
import { ShipChangeKind } from './ship-change-kind';
import { ChangeType } from './stock-status';
import { TransferChangeKind } from './transfer-change-kind';
import { isPositiveQuantity } from '../utils/quantity';

/** The two directions a change row can take. */
interface SignedChangeTypes {
  readonly positive: ChangeType;
  readonly negative: ChangeType;
}

/** How a change table's rows turn into a {@link ChangeType}. */
export type ChangeRule =
  | { readonly mode: 'fixed'; readonly changeType: ChangeType }
  /** `quantityChanged > 0` is one type, anything else the other. */
  | ({ readonly mode: 'sign' } & SignedChangeTypes)
  /**
   * The intent is stored in the row's `kind` column because the sign cannot
   * carry it. `legacySign` is what the *list* (not the event) falls back on for
   * a row written before the column existed.
   */
  | {
      readonly mode: 'kind';
      readonly byKind: Readonly<Record<string, ChangeType>>;
      readonly legacySign?: SignedChangeTypes;
    };

/** The change row's own columns a rule reads. */
export interface ClassifiableChange {
  readonly quantityChanged: number | string;
  readonly kind?: string | null;
}

export interface ChangeClassification {
  /** The table's declared name, before any `withWmsTablePrefix` rewrite. */
  readonly table: string;
  readonly rule: ChangeRule;
  /**
   * Which `stocks` row of the change's order the change log shows. Almost every
   * table writes a stock row whose sign follows the change's (`same`); a scrape
   * records a positive `quantityChanged` while taking stock out, so its row is
   * the opposite one. Queried this way, rather than corrected at the writer, so
   * rows written before the rule existed are listed as well.
   */
  readonly stockSign: 'same' | 'opposite';
}

const same = (table: string, rule: ChangeRule): ChangeClassification => ({
  table,
  rule,
  stockSign: 'same',
});

/**
 * The one answer to "what does a row of this change table mean?".
 *
 * `StockChangeSubscriber` resolves each inserted row with it to pick the
 * `stock.*` event, and `StockService.findChangeLogs` renders it as a SQL `CASE`
 * to classify and select the rows it lists. Both read this table so the event
 * and the change log can never disagree about a movement. **A new change table
 * this package owns is added here and nowhere else.**
 */
export const CHANGE_CLASSIFICATIONS: readonly ChangeClassification[] = [
  same('receive_inventory_order_changes', {
    mode: 'fixed',
    changeType: ChangeType.RECEIVED,
  }),
  same('ship_inventory_order_changes', {
    mode: 'kind',
    byKind: {
      [ShipChangeKind.RESERVE]: ChangeType.IN_SHIPMENT,
      [ShipChangeKind.SHIP]: ChangeType.SHIPPED,
      [ShipChangeKind.CANCEL]: ChangeType.SHIP_CANCELLED,
    },
    legacySign: {
      positive: ChangeType.IN_SHIPMENT,
      negative: ChangeType.SHIPPED,
    },
  }),
  same('transfer_order_changes', {
    mode: 'kind',
    byKind: {
      [TransferChangeKind.RESERVE]: ChangeType.IN_TRANSFER,
      [TransferChangeKind.TRANSFER]: ChangeType.TRANSFERRED,
      [TransferChangeKind.CANCEL]: ChangeType.TRANSFER_CANCELLED,
    },
    legacySign: {
      positive: ChangeType.IN_TRANSFER,
      negative: ChangeType.TRANSFERRED,
    },
  }),
  same('transfer_vendor_order_changes', {
    mode: 'sign',
    positive: ChangeType.VENDOR_TRANSFERRED,
    negative: ChangeType.VENDOR_RETURNED,
  }),
  same('transfer_customer_order_changes', {
    mode: 'sign',
    positive: ChangeType.CUSTOMER_HELD,
    negative: ChangeType.CUSTOMER_RETURNED,
  }),
  same('hold_inventory_order_changes', {
    mode: 'sign',
    positive: ChangeType.HELD,
    negative: ChangeType.RELEASED,
  }),
  same('allocate_inventory_order_changes', {
    mode: 'sign',
    positive: ChangeType.ALLOCATED,
    negative: ChangeType.DEALLOCATED,
  }),
  same('split_batch_order_changes', {
    mode: 'fixed',
    changeType: ChangeType.SPLITTED,
  }),
  same('merge_batch_order_changes', {
    mode: 'fixed',
    changeType: ChangeType.MERGED,
  }),
  same('reclassify_inventory_order_changes', {
    mode: 'fixed',
    changeType: ChangeType.RECLASSIFIED,
  }),
  {
    table: 'scrape_order_changes',
    rule: { mode: 'fixed', changeType: ChangeType.SCRAPED },
    stockSign: 'opposite',
  },
  same('inventory_count_order_changes', {
    mode: 'sign',
    positive: ChangeType.COUNT_GAINED,
    negative: ChangeType.COUNT_LOST,
  }),
  same('consumption_order_changes', {
    mode: 'kind',
    byKind: {
      [ConsumptionChangeKind.ISSUE]: ChangeType.ISSUED,
      [ConsumptionChangeKind.RETURN]: ChangeType.RETURNED,
      [ConsumptionChangeKind.SETTLE]: ChangeType.CONSUMED,
    },
  }),
];

/**
 * The `ChangeType` of one row, as the subscriber classifies it: `null` for a
 * row the rule cannot place (a `kind` it does not know, or none at all). No
 * event beats a wrong one, so the legacy sign fallback is *not* applied here.
 */
export const classifyChange = (
  rule: ChangeRule,
  { quantityChanged, kind }: ClassifiableChange,
): ChangeType | null => {
  switch (rule.mode) {
    case 'fixed':
      return rule.changeType;
    case 'sign':
      return isPositiveQuantity(quantityChanged)
        ? rule.positive
        : rule.negative;
    case 'kind':
      return kind ? (rule.byKind[kind] ?? null) : null;
  }
};

/**
 * The same rule as a SQL expression over a joined change table `alias`, for
 * the change log. Yields NULL where the row is not classified.
 */
export const changeTypeSqlOf = (alias: string, rule: ChangeRule): string => {
  const signed = ({ positive, negative }: SignedChangeTypes): string =>
    `CASE WHEN ${alias}."quantityChanged" > 0 THEN '${positive}' ELSE '${negative}' END`;

  switch (rule.mode) {
    case 'fixed':
      return `'${rule.changeType}'`;
    case 'sign':
      return signed(rule);
    case 'kind':
      return `CASE ${alias}.kind ${Object.entries(rule.byKind)
        .map(([kind, type]) => `WHEN '${kind}' THEN '${type}'`)
        .join(
          ' ',
        )} ELSE ${rule.legacySign ? signed(rule.legacySign) : 'NULL'} END`;
  }
};
