import { PaginationInput } from './paginations';
import { ListSort } from './list-sort';

/**
 * Columns `MaterialService.findMany` can sort by. Values are part of the public
 * GraphQL schema (`MaterialSortField`): adding one is a minor change, renaming
 * or removing one is breaking.
 */
export enum MaterialSortField {
  KEY = 'KEY',
  DESCRIPTION = 'DESCRIPTION',
  /** The base unit's `key` (the column stores the unit's id). */
  BASE_UNIT = 'BASE_UNIT',
  IS_ACTIVE = 'IS_ACTIVE',
  CREATED_AT = 'CREATED_AT',
}

export type FindMaterialInput<U> = PaginationInput & {
  materialId?: string;
  materialIds?: string[];
  description?: string;
  wildcard?: {
    key: keyof U;
    value: string;
  };
  /** Omitted: newest first (`createdAt DESC`), then `id`. */
  sort?: ListSort<MaterialSortField> | null;
};
