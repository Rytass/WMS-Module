import { PaginationInput } from './paginations';

export enum ReceiveInventoryOrderStatus {
  PENDING = 'PENDING',
  RECEIVED = 'RECEIVED',
  REMOVED = 'REMOVED',
  PARTIAL_RECEIVED = 'PARTIAL_RECEIVED',
}

export type FindReceiveInventoryOrderInput = PaginationInput & {
  id?: string;
  createdBy?: string;
  status?: ReceiveInventoryOrderStatus;
  dateRange?: {
    from: Date;
    to: Date;
  };
  description?: string;
};
