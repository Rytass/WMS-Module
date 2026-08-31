import { InventoryCountStatus } from '../../../graphql/generated/.graphql';

export interface FilterValues {
  name?: string;
  statuses?: InventoryCountStatus[];
  createdBy?: string;
  countDateFrom?: string;
  countDateTo?: string;
  locationIds?: string[];
}

/**
 * Filters on the count sheet itself (the detail page's table).
 *
 * The first five are the ones the design puts on the bar; the rest live behind
 * 進階搜尋 and are also what a quick-filter click on a cell writes into.
 */
export interface ItemFilterValues {
  materialKey?: string;
  materialDescription?: string;
  batchKey?: string;
  locationKey?: string;
  loaderSerialId?: string;
  vendorId?: string;
  customerId?: string;
  saleId?: string;
  saleSerialId?: string;
  onlyVariance?: boolean;
}

/** The item-filter keys a table cell can quick-filter on. */
export type QuickFilterKey = Exclude<keyof ItemFilterValues, 'onlyVariance'>;
