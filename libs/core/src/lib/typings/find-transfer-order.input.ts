import { PaginationInput } from './paginations';

export type FindTransferOrderInput = PaginationInput & {
  key?: string;
  receiver?: string;
  createdBy?: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
  description?: string;
  materialId?: string;
  batchId?: string;
  locationId?: string;
  loaderId?: string;
};
