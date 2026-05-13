export enum StockStatus {
  PENDING_INSPECTION = 'PENDING_INSPECTION',
  INSPECTION_FAILED = 'INSPECTION_FAILED',
  HELD = 'HELD',
  IN_TRANSFER = 'IN_TRANSFER',
  IN_SHIPMENT = 'IN_SHIPMENT',
  ALLOCATED = 'ALLOCATED',
  VENDOR_INVENTORY = 'VENDOR_INVENTORY',
  CUSTOMER_INVENTORY = 'CUSTOMER_INVENTORY',
  FREE = 'FREE',
}

export enum ChangeType {
  // receive-inventory-order-change.entity.ts
  RECEIVED = 'RECEIVED',

  // ship-inventory-order-change.entity.ts, change > 0
  IN_SHIPMENT = 'IN_SHIPMENT',

  // ship-inventory-order-change.entity.ts, change < 0
  SHIPPED = 'SHIPPED',

  // transfer-order-change.entity.ts, change > 0
  IN_TRANSFER = 'IN_TRANSFER',

  // transfer-order-change.entity.ts, change < 0
  TRANSFERRED = 'TRANSFERRED',

  // vendor-inventory-change.entity.ts, change > 0
  VENDOR_TRANSFERRED = 'VENDOR_TRANSFERRED',

  // vendor-inventory-change.entity.ts, change < 0
  VENDOR_RETURNED = 'VENDOR_RETURNED',

  // hold-inventory-order-change.entity.ts, change > 0
  HELD = 'HELD',

  // hold-inventory-order-change.entity.ts, change < 0
  RELEASED = 'RELEASED',

  // customer-inventory-change.entity.ts, change > 0
  CUSTOMER_HELD = 'CUSTOMER_HELD',

  // customer-inventory-change.entity.ts, change < 0
  CUSTOMER_RETURNED = 'CUSTOMER_RETURNED',

  // split-ivnentory-change.entity.ts
  SPLITTED = 'SPLITTED',

  // merge-inventory-change.entity.ts
  MERGED = 'MERGED',

  // allocate-inventory-change.entity.ts, change > 0
  ALLOCATED = 'ALLOCATED',

  // allocate-inventory-change.entity.ts, change < 0
  DEALLOCATED = 'DEALLOCATED',

  // reclassify-inventory-order-change.entity.ts
  RECLASSIFIED = 'RECLASSIFIED',

  // scrape-order-change.entity.ts
  SCRAPED = 'SCRAPED',
}
