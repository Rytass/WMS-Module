import { PaginationInput } from './paginations';

export type FindLocationInput<U extends object> = PaginationInput & {
  description?: string;
  wildcard?: {
    key: keyof U;
    value: string;
  };
};
