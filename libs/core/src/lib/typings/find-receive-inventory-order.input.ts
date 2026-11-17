import { PaginationInput } from './paginations';
import { ListSort } from './list-sort';

export enum ReceiveInventoryOrderStatus {
  PENDING = 'PENDING',
  RECEIVED = 'RECEIVED',
  REMOVED = 'REMOVED',
  PARTIAL_RECEIVED = 'PARTIAL_RECEIVED',
}

/**
 * Columns `ReceiveInventoryOrderService.findMany` can sort by. Values are part
 * of the public GraphQL schema (`ReceiveInventoryOrderSortField`): add freely, never rename or
 * remove. Per-item columns (material, batch, location, loader) are left out:
 * an order has many items, so they have no single value to sort by.
 */
export enum ReceiveInventoryOrderSortField {
  /**
   * The computed status, in lifecycle order: pending → partially received →
   * received → removed.
   */
  STATUS = 'STATUS',
  KEY = 'KEY',
  CREATED_BY = 'CREATED_BY',
  CREATED_AT = 'CREATED_AT',
  DESCRIPTION = 'DESCRIPTION',
}

export type FindReceiveInventoryOrderInput<T> = PaginationInput & {
  id?: string;
  createdBy?: string;
  status?: ReceiveInventoryOrderStatus;
  statuses?: ReceiveInventoryOrderStatus[];
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
  sort?: ListSort<ReceiveInventoryOrderSortField> | null;
};
