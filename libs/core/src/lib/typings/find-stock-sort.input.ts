import type { FindStockInput } from './find-stock.input';
import type { ListSort } from './list-sort';

/**
 * Columns `StockService.findAggregatedStocks` can sort by. Values are part of
 * the public GraphQL schema (`AggregatedStockSortField`): adding one is a minor
 * change, renaming or removing one is breaking.
 *
 * Every one is single-valued per aggregated row: a row is one (material, batch,
 * location, loader, status) position, and each joined key is one-to-one with
 * its id.
 */
export enum AggregatedStockSortField {
  /** The derived status code (`FREE`, `HELD`, …), compared as text. */
  STATUS = 'STATUS',
  MATERIAL_KEY = 'MATERIAL_KEY',
  MATERIAL_DESCRIPTION = 'MATERIAL_DESCRIPTION',
  /** The batch *group*'s key — what the `batch { key }` field shows. */
  BATCH_KEY = 'BATCH_KEY',
  LOCATION_KEY = 'LOCATION_KEY',
  LOADER_SERIAL_ID = 'LOADER_SERIAL_ID',
  QUANTITY = 'QUANTITY',
  /** The material's base unit `key`. */
  BASE_UNIT = 'BASE_UNIT',
  VENDOR_ID = 'VENDOR_ID',
  CUSTOMER_ID = 'CUSTOMER_ID',
  SALE_ID = 'SALE_ID',
  SALE_SERIAL_ID = 'SALE_SERIAL_ID',
}

export type FindAggregatedStockInput<U extends object> = Omit<
  FindStockInput<U>,
  'sort'
> & {
  /**
   * Omitted: by the group key — material id, batch id, location id, loader id,
   * status — which is stable but not meaningful to a reader. A sort is
   * followed by that same group key as the tiebreaker.
   */
  sort?: ListSort<AggregatedStockSortField> | null;
};

/**
 * Columns `StockService.findManyGroupedByMaterialId` can sort by. Values are
 * part of the public GraphQL schema (`StockGroupedByMaterialSortField`).
 */
export enum StockGroupedByMaterialSortField {
  MATERIAL_KEY = 'MATERIAL_KEY',
  MATERIAL_DESCRIPTION = 'MATERIAL_DESCRIPTION',
  /** The material's total over the matching positions (`SUM(quantity)`). */
  QUANTITY = 'QUANTITY',
  /** The material's base unit `key`. */
  BASE_UNIT = 'BASE_UNIT',
}

export type FindStockGroupedByMaterialInput<U extends object> = Omit<
  FindStockInput<U>,
  'sort'
> & {
  /** Omitted: material key ascending, then material id. */
  sort?: ListSort<StockGroupedByMaterialSortField> | null;
};
