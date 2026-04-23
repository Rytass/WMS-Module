import { PaginationInput } from './paginations';

export type FindLocationInput<U extends object> = PaginationInput & {
  description?: string;
  isActive?: boolean;
  wildcard?: {
    key: keyof U;
    value: string;
  };
};
