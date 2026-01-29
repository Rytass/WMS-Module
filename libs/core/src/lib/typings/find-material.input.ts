import { PaginationInput } from './paginations';

export type FindMaterialInput<U> = PaginationInput & {
  materialId?: string;
  materialIds?: string[];
  description?: string;
  wildcard?: {
    key: keyof U;
    value: string;
  };
};
