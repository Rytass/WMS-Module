import { PaginationInput } from './paginations';

export type FindLoaderInput = PaginationInput & {
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
};

export type FindLoaderTypeInput<U> = PaginationInput & {
  description?: string;
  isActive?: boolean;
  // id && serial
  code?: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
  wildcard?: {
    key: keyof U;
    value: string;
  };
};
