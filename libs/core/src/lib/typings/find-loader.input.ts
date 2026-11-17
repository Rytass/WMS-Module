import { PaginationInput } from './paginations';
import { ListSort } from './list-sort';

/**
 * Columns `LoaderService.findManyLoaders` can sort by. Values are part of the
 * public GraphQL schema (`LoaderSortField`): add freely, never rename or remove.
 */
export enum LoaderSortField {
  SERIAL_ID = 'SERIAL_ID',
  /** The loader type's `description`. */
  TYPE_DESCRIPTION = 'TYPE_DESCRIPTION',
  /** The location's `key`. */
  LOCATION_KEY = 'LOCATION_KEY',
  LENGTH = 'LENGTH',
  WIDTH = 'WIDTH',
  HEIGHT = 'HEIGHT',
  SIZE_UNIT = 'SIZE_UNIT',
  VOLUME = 'VOLUME',
  VOLUME_UNIT = 'VOLUME_UNIT',
  NOTE = 'NOTE',
  IS_ACTIVE = 'IS_ACTIVE',
  CREATED_AT = 'CREATED_AT',
}

/**
 * Columns `LoaderService.findManyLoaderTypes` can sort by (`LoaderTypeSortField`).
 */
export enum LoaderTypeSortField {
  KEY = 'KEY',
  DESCRIPTION = 'DESCRIPTION',
  IS_ACTIVE = 'IS_ACTIVE',
  CREATED_AT = 'CREATED_AT',
}

export type FindLoaderInput<U> = PaginationInput & {
  typeId?: string;
  typeIds?: string[];
  locationId?: string;
  locationIds?: string[];
  serialId?: string;
  serialIds?: string[];
  isActive?: boolean;
  dateRange?: {
    from: Date;
    to: Date;
  };
  note?: string;
  locationKey?: string;
  loaderTypeKey?: string;
  wildcard?: {
    key: keyof U;
    value: string;
  };
  /** Omitted: newest first (`createdAt DESC`), then `id`. */
  sort?: ListSort<LoaderSortField> | null;
};

export type FindLoaderTypeInput<U> = PaginationInput & {
  description?: string;
  isActive?: boolean;
  dateRange?: {
    from: Date;
    to: Date;
  };
  wildcard?: {
    key: keyof U;
    value: string;
  };
  /** Omitted: newest first (`createdAt DESC`), then `id`. */
  sort?: ListSort<LoaderTypeSortField> | null;
};
