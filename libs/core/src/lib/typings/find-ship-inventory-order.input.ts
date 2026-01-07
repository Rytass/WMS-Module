import { PaginationInput } from './paginations';

export enum ShipInventoryOrderStatus {
  PENDING = 'PENDING',
  SHIPPED = 'SHIPPED',
  REMOVED = 'REMOVED',
  PARTIAL_SHIPPED = 'PARTIAL_SHIPPED',
}

export type FindShipInventoryOrderInput = PaginationInput & {
  id?: string;
  createdBy?: string;
  status?: ShipInventoryOrderStatus;
  dateRange?: {
    from: Date;
    to: Date;
  };
  description?: string;
};
