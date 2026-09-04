/**
 * @file order-type.ts
 * The order families this package owns, named exactly as the `resource` half of
 * the matching {@link WmsOperationName}s.
 *
 * One vocabulary, two uses: it is what `@WmsOperation` already calls each
 * family, and it is what `order_references.orderType` stores. Reusing the
 * strings rather than inventing a parallel set means a host that has switched
 * `hold-inventory-order:create` off already knows the name to look for when it
 * queries that family's references.
 *
 * Adding a family here is additive for consumers; renaming one is a breaking
 * change, because the value is persisted in `order_references`.
 */
export enum WmsOrderType {
  ALLOCATE_INVENTORY_ORDER = 'allocate-inventory-order',
  HOLD_INVENTORY_ORDER = 'hold-inventory-order',
  INVENTORY_COUNT_ORDER = 'inventory-count-order',
  MERGE_BATCH_ORDER = 'merge-batch-order',
  QUALITY_INSPECTION_ORDER = 'quality-inspection-order',
  RECEIVE_INVENTORY_ORDER = 'receive-inventory-order',
  RECLASSIFY_INVENTORY_ORDER = 'reclassify-inventory-order',
  SCRAPE_ORDER = 'scrape-order',
  SHIP_INVENTORY_ORDER = 'ship-inventory-order',
  SPLIT_BATCH_ORDER = 'split-batch-order',
  TRANSFER_CUSTOMER_ORDER = 'transfer-customer-order',
  TRANSFER_ORDER = 'transfer-order',
  TRANSFER_VENDOR_ORDER = 'transfer-vendor-order',
}
