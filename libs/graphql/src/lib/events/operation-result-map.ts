/**
 * @file operation-result-map.ts
 * Typed overlay that maps every {@link WmsOperationEventName} to the concrete
 * DTO (or `boolean`) returned by that mutation.  Used by {@link WmsEventPayloadFor}
 * and the consumer-facing typed hook/listener maps in `typed-maps.ts`.
 *
 * `WmsOperationResultMap` extends `Record<WmsOperationEventName, unknown>` so
 * the compiler rejects any key that is not a valid operation-event name, and
 * flags missing keys at the interface level — every new mutation must add an
 * entry here.
 */
import type { WmsOperationEventName } from '@rytass/wms-module-core';

// DTOs available through the dto barrel ----------------------------------- //
import type {
  AllocateInventoryOrderDto,
  HoldInventoryOrderDto,
  LoaderDto,
  LoaderTypeDto,
  MaterialDto,
  QualityInspectionOrderDto,
  ReceiveInventoryOrderDto,
  ScrapeOrderDto,
  ShipInventoryOrderDto,
  TransferCustomerOrderDto,
  TransferOrderDto,
  TransferVendorOrderDto,
} from '../dto';

// DTOs not yet re-exported from the barrel — import directly -------------- //
import type { LocationDto } from '../dto/location.dto';
import type {
  InventoryCountOrderDto,
  InventoryCountOrderItemDto,
} from '../dto/inventory-count-order.dto';
import type { MapDataDto } from '../dto/warehouse-map.dto';
import type { MergeBatchOrderDto } from '../dto/merge-batch-order.dto';
import type { ReclassifyInventoryOrderDto } from '../dto/reclassify-inventory-order.dto';
import type { SplitBatchOrderDto } from '../dto/split-batch-order.dto';

/**
 * Maps every {@link WmsOperationEventName} to the concrete type returned by
 * the corresponding mutation resolver.
 *
 * - **DTO-returning mutations (29)**: the resolved DTO class.
 * - **Action mutations (9)**: `boolean` (success flag; real intent is in
 *   `WmsOperationEventPayload.args` and the accompanying stock events).
 *
 * Maintenance: for every new `@Mutation`, add the matching entry here.
 */
export interface WmsOperationResultMap
  extends Record<WmsOperationEventName, unknown> {
  // ── Inventory count ───────────────────────────────────────────────────── //
  // `add-item` returns the created line; every other count mutation returns the
  // order, so subscribers always get the state the operation left behind.
  'inventory-count-order.created': InventoryCountOrderDto;
  'inventory-count-order.updated':
    | InventoryCountOrderDto
    | InventoryCountOrderItemDto;
  'inventory-count-order.started': InventoryCountOrderDto;
  'inventory-count-order.counted': InventoryCountOrderDto;
  'inventory-count-order.reset': InventoryCountOrderDto;
  'inventory-count-order.cancelled': InventoryCountOrderDto;
  'inventory-count-order.settled': InventoryCountOrderDto;

  // ── Material ──────────────────────────────────────────────────────────── //
  'material.created': MaterialDto;
  'material.updated': MaterialDto;

  // ── Location ──────────────────────────────────────────────────────────── //
  'location.created': LocationDto;
  'location.updated': LocationDto;

  // ── Warehouse map ─────────────────────────────────────────────────────── //
  'warehouse-map.updated': MapDataDto;

  // ── Loader ────────────────────────────────────────────────────────────── //
  'loader.created': LoaderDto[];
  'loader.batch-created': LoaderDto[];
  'loader.updated': LoaderDto;
  'loader.type-created': LoaderTypeDto;
  'loader.type-updated': LoaderTypeDto;

  // ── Receive inventory order ───────────────────────────────────────────── //
  'receive-inventory-order.created': ReceiveInventoryOrderDto;
  'receive-inventory-order.updated': ReceiveInventoryOrderDto;
  /** Action mutation — result is a success flag; use args + stock.received. */
  'receive-inventory-order.received': boolean;

  // ── Allocate inventory order ──────────────────────────────────────────── //
  'allocate-inventory-order.created': AllocateInventoryOrderDto;
  'allocate-inventory-order.updated': AllocateInventoryOrderDto;
  /** Action mutation — result is a success flag; use args + stock.deallocated. */
  'allocate-inventory-order.deallocated': boolean;

  // ── Hold inventory order ──────────────────────────────────────────────── //
  'hold-inventory-order.created': HoldInventoryOrderDto;
  'hold-inventory-order.updated': HoldInventoryOrderDto;
  /** Action mutation — result is a success flag; use args + stock.released. */
  'hold-inventory-order.released': boolean;

  // ── Reclassify inventory order ────────────────────────────────────────── //
  'reclassify-inventory-order.reclassified': ReclassifyInventoryOrderDto;

  // ── Ship inventory order ──────────────────────────────────────────────── //
  'ship-inventory-order.created': ShipInventoryOrderDto;
  'ship-inventory-order.updated': ShipInventoryOrderDto;
  /** Action mutation — result is a success flag; use args + stock.shipped. */
  'ship-inventory-order.shipped': boolean;
  /** Action mutation — result is a success flag; use args + stock.shipped (negative). */
  'ship-inventory-order.ship-cancelled': boolean;

  // ── Batch ─────────────────────────────────────────────────────────────── //
  'batch.merged': MergeBatchOrderDto;
  'batch.splitted': SplitBatchOrderDto;

  // ── Scrape order ──────────────────────────────────────────────────────── //
  'scrape-order.scraped': ScrapeOrderDto;

  // ── Quality inspection order ──────────────────────────────────────────── //
  'quality-inspection-order.inspected': QualityInspectionOrderDto;

  // ── Transfer order ────────────────────────────────────────────────────── //
  'transfer-order.created': TransferOrderDto;
  'transfer-order.updated': TransferOrderDto;
  /** Action mutation — result is a success flag; use args + stock.transferred. */
  'transfer-order.transferred': boolean;
  /** Action mutation — result is a success flag; use args + stock.in-transfer reversal. */
  'transfer-order.transfer-cancelled': boolean;

  // ── Transfer customer order ───────────────────────────────────────────── //
  'transfer-customer-order.created': TransferCustomerOrderDto;
  'transfer-customer-order.updated': TransferCustomerOrderDto;
  /** Action mutation — result is a success flag; use args + stock.customer-returned. */
  'transfer-customer-order.returned': boolean;

  // ── Transfer vendor order ─────────────────────────────────────────────── //
  'transfer-vendor-order.created': TransferVendorOrderDto;
  'transfer-vendor-order.updated': TransferVendorOrderDto;
  /** Action mutation — result is a success flag; use args + stock.vendor-returned. */
  'transfer-vendor-order.returned': boolean;
}
