import { PaginationInput } from './paginations';
import { ListSort } from './list-sort';

/**
 * Columns `LocationService.findMany` can sort by. Values are part of the public
 * GraphQL schema (`LocationSortField`): add freely, never rename or remove.
 */
export enum LocationSortField {
  KEY = 'KEY',
  DESCRIPTION = 'DESCRIPTION',
  IS_ACTIVE = 'IS_ACTIVE',
  CREATED_AT = 'CREATED_AT',
}

export type FindLocationInput<U extends object> = PaginationInput & {
  description?: string;
  isActive?: boolean;
  root?: boolean;
  wildcard?: {
    key: keyof U;
    value: string;
  };
  /** Omitted: newest first (`createdAt DESC`), then `id`. */
  sort?: ListSort<LocationSortField> | null;
};
