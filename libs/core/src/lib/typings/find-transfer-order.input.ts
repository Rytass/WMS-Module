import { PaginationInput } from './paginations';
import { ListSort } from './list-sort';

/**
 * Columns `TransferOrderService.findMany` can sort by. Values are part of the
 * public GraphQL schema (`TransferOrderSortField`): add freely, never rename or
 * remove. Per-item columns (material, batch, locations, loaders) are left out:
 * an order has many items, so they have no single value to sort by.
 */
export enum TransferOrderSortField {
  KEY = 'KEY',
  RECEIVER = 'RECEIVER',
  DESCRIPTION = 'DESCRIPTION',
  CREATED_BY = 'CREATED_BY',
  CREATED_AT = 'CREATED_AT',
}

export type FindTransferOrderInput = PaginationInput & {
  key?: string;
  receiver?: string;
  createdBy?: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
  description?: string;
  materialId?: string;
  batchId?: string;
  locationId?: string;
  loaderId?: string;
  materialKey?: string;
  batchKey?: string;
  locationKey?: string;
  loaderKey?: string;
  targetLocationKey?: string;
  targetLoaderKey?: string;
  /** Omitted: newest first (`createdAt DESC`), then `id`. */
  sort?: ListSort<TransferOrderSortField> | null;
};
