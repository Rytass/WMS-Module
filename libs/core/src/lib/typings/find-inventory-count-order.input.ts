/**
 * Columns `InventoryCountOrderService.findMany` can sort by. Values are part of
 * the public GraphQL schema (`InventoryCountOrderSortField`): add freely, never
 * rename or remove. The scope (盤點範圍) is left out: a count covers many
 * locations, so it has no single value to sort by.
 */
export enum InventoryCountOrderSortField {
  NAME = 'NAME',
  /** The PostgreSQL enum's declaration order: pending → counting → completed → cancelled. */
  STATUS = 'STATUS',
  COUNT_DATE = 'COUNT_DATE',
  CREATED_BY = 'CREATED_BY',
  CREATED_AT = 'CREATED_AT',
}

/**
 * Columns `InventoryCountOrderService.findItems` (the count sheet) can sort by
 * (`InventoryCountOrderItemSortField`). The quantity columns are left out: the
 * sheet shows them in the line's selected unit, which the operator can change
 * locally before saving, so no server order could match what is on screen.
 */
export enum InventoryCountOrderItemSortField {
  MATERIAL_KEY = 'MATERIAL_KEY',
  MATERIAL_DESCRIPTION = 'MATERIAL_DESCRIPTION',
  BATCH_KEY = 'BATCH_KEY',
  LOCATION_KEY = 'LOCATION_KEY',
  LOADER_SERIAL_ID = 'LOADER_SERIAL_ID',
  VENDOR_ID = 'VENDOR_ID',
  CUSTOMER_ID = 'CUSTOMER_ID',
  SALE_ID = 'SALE_ID',
  SALE_SERIAL_ID = 'SALE_SERIAL_ID',
  /** Lines the operator added during the count. */
  IS_ADDITION = 'IS_ADDITION',
  /** The 凍結 icon: `held`, a NULL snapshot read as not held. */
  HELD = 'HELD',
  /** The 調撥 icon: the line had a `transferId`. */
  IN_TRANSFER = 'IN_TRANSFER',
  /**
   * The 待檢驗 icon, ranked: no mark (0) < failed inspection (1) < awaiting
   * inspection (2, `requiresInspection` and no result yet).
   */
  INSPECTION = 'INSPECTION',
}
