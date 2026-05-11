import { PaginationInput } from './paginations';

export enum ShipInventoryOrderStatus {
  PENDING = 'PENDING',
  SHIPPED = 'SHIPPED',
  REMOVED = 'REMOVED',
  PARTIAL_SHIPPED = 'PARTIAL_SHIPPED',
}

export type FindShipInventoryOrderInput<T> = PaginationInput & {
  id?: string;
  createdBy?: string;
  status?: ShipInventoryOrderStatus;
  statuses?: ShipInventoryOrderStatus[];
  dateRange?: {
    from: Date;
    to: Date;
  };
  description?: string;
  materialKey?: string;
  batchKey?: string;
  locationKey?: string;
  loaderKey?: string;
  wildcard?: {
    key: keyof T;
    value: string;
  };
};
