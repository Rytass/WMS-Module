import { PaginationInput } from './paginations';
import { ListSort } from './list-sort';

export enum ShipInventoryOrderStatus {
  PENDING = 'PENDING',
  SHIPPED = 'SHIPPED',
  REMOVED = 'REMOVED',
  PARTIAL_SHIPPED = 'PARTIAL_SHIPPED',
}

/**
 * Columns `ShipInventoryOrderService.findMany` can sort by. Values are part
 * of the public GraphQL schema (`ShipInventoryOrderSortField`): add freely, never rename or
 * remove. Per-item columns (material, batch, location, loader) are left out:
 * an order has many items, so they have no single value to sort by.
 */
export enum ShipInventoryOrderSortField {
  /**
   * The computed status, in lifecycle order: pending → partially shipped →
   * shipped → removed.
   */
  STATUS = 'STATUS',
  KEY = 'KEY',
  CREATED_BY = 'CREATED_BY',
  CREATED_AT = 'CREATED_AT',
  DESCRIPTION = 'DESCRIPTION',
}

export type FindShipInventoryOrderInput<T> = PaginationInput & {
  id?: string;
  createdBy?: string;
  status?: ShipInventoryOrderStatus;
  statuses?: ShipInventoryOrderStatus[];
  dateRange?: {
    from: Date;
    to: Date;
  };
  description?: string;
  materialKey?: string;
  batchKey?: string;
  locationKey?: string;
  loaderKey?: string;
  wildcard?: {
    key: keyof T;
    value: string;
  };
  /** Omitted: newest first (`createdAt DESC`), then `id`. */
  sort?: ListSort<ShipInventoryOrderSortField> | null;
};
