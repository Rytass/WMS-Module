import { PaginationInput } from './paginations';

export type FindMaterialInput = PaginationInput & {
  materialId?: string;
  materialIds?: string[];
  description?: string;
};
