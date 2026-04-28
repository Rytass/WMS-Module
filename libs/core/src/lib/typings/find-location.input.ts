import { PaginationInput } from './paginations';

export type FindLocationInput<U extends object> = PaginationInput & {
  description?: string;
  isActive?: boolean;
  root?: boolean;
  wildcard?: {
    key: keyof U;
    value: string;
  };
};
