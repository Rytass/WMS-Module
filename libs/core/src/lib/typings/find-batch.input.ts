import { PaginationInput } from './paginations';

export type FindBatchInput<U extends object> = PaginationInput & {
  wildcard?: {
    key: keyof U;
    value: string;
  };

  materialId?: string;
};
