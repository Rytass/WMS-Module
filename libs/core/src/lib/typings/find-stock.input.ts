import { PaginationInput } from './paginations';

export type FindStockInput = PaginationInput & {
  materialId?: string;
  batchId?: string;
  locationId?: string;
  loaderId?: string;
  description?: string;
};
