import { PaginationInput } from './paginations';

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
  wildcard?: {
    key: keyof U;
    value: string;
  };
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
};
