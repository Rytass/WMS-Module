import { PaginationInput } from './paginations';

export type FindHoldInventoryOrderInput = PaginationInput & {
  key?: string;
  createdBy?: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
  materialId?: string;
  batchId?: string;
  locationId?: string;
  loaderId?: string;
};
