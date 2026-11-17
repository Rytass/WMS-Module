import { FindStockInput } from './find-stock.input';
import { ListSort } from './list-sort';

/**
 * Columns `StockService.findChangeLogs` can sort by. Values are part of the
 * public GraphQL schema (`ChangeLogSortField`): add freely, never rename or
 * remove.
 */
export enum ChangeLogSortField {
  /** The computed change type, in `ChangeType` declaration order. */
  CHANGE_TYPE = 'CHANGE_TYPE',
  MATERIAL_KEY = 'MATERIAL_KEY',
  MATERIAL_DESCRIPTION = 'MATERIAL_DESCRIPTION',
  BATCH_KEY = 'BATCH_KEY',
  LOCATION_KEY = 'LOCATION_KEY',
  /** The quantity's magnitude, as `changeLogs` returns it. */
  QUANTITY = 'QUANTITY',
  /** The material's base unit `key`. */
  BASE_UNIT = 'BASE_UNIT',
  CREATED_AT = 'CREATED_AT',
}

/**
 * The stock filters plus the change log's own sort. `sort` is omitted from the
 * stock input first so a sort added to stock lists never collides with this one.
 */
export type FindChangeLogInput<U extends object> = Omit<
  FindStockInput<U>,
  'sort'
> & {
  /** Omitted: newest first (`createdAt DESC`), then `id`. */
  sort?: ListSort<ChangeLogSortField> | null;
};
