import type { ChangeType } from '../constants/stock-status';

/**
 * A `*_order_changes` row as the stock subscriber sees it, immediately after
 * insert and before any relation is loaded.
 *
 * The shape is deliberately loose past the three columns every change table in
 * this package agrees on: a host's own table may carry whatever else it needs,
 * and its resolver is the only thing that reads those extras.
 */
export interface WmsStockChangeRow {
  /** The base order id, which is also the change's own primary key. */
  readonly id: string;
  /** The order item this change applies to. */
  readonly itemId: string;
  /** Signed: positive brings stock into a state, negative takes it out. */
  readonly quantityChanged: number | string;
  readonly [column: string]: unknown;
}

/**
 * A change table this package does not own, registered so its rows still emit
 * `stock.*` events.
 *
 * ### What a host gets without this
 *
 * More than you would expect. A host that writes its own order family already
 * inherits, for free:
 *
 * - **transactions and stock arithmetic** — `dataSource.transaction` and
 *   `StockService.validateStockAvailability` are ordinary public API;
 * - **the inventory count lock** — `InventoryCountLockSubscriber` keys off
 *   `tableName.endsWith('_order_changes')`, so any table following the naming
 *   convention is covered, provided its change row reaches an order item
 *   carrying a `locationId` through an `item` relation;
 * - **the change history**, since the ledger is `stocks` rows, not a table this
 *   package has to know about.
 *
 * The one thing it does not get is an event, because `StockChangeSubscriber`
 * maps table name to `ChangeType` through a closed table. This registers into
 * that map, and is deliberately the *only* extension point of its kind: opening
 * up order types, resolvers or the GraphQL schema would trade the module's one
 * real guarantee — that it knows what every movement in it means — for
 * something a host can already do with an entity of its own.
 *
 * ### The bargain
 *
 * A movement the module cannot classify is a hole in its reports: it can see
 * that stock moved, not what the movement was. Mapping onto an existing
 * {@link ChangeType} avoids that and should be preferred whenever the movement
 * genuinely is a receipt, a shipment, a scrap. A host-defined string is for the
 * cases where it genuinely is not — and those belong in a proposal upstream,
 * not here, once they stop being one deployment's special case.
 */
export interface WmsCustomChangeTable {
  /**
   * The table name TypeORM reports for the change entity. Must end in
   * `_order_changes` like every other change table, or the inventory count lock
   * will not see it either.
   */
  readonly table: string;
  /**
   * What kind of movement this row is.
   *
   * Return a {@link ChangeType} member to reuse this package's vocabulary — the
   * row then emits that type's own `stock.*` event and counts in reports like
   * any built-in movement. Return any other string to emit `stock.custom`
   * carrying it as `customChangeType`. Return `null` to emit nothing, which is
   * the right answer for a row that does not move stock at all.
   */
  readonly changeType: (
    change: WmsStockChangeRow,
  ) => ChangeType | string | null;
}
