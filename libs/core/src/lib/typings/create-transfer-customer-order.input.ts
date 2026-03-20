import { StockStatus } from '../constants';

export type CreateTransferCustomerOrderItemInput = {
  // batch id to transfer
  batchId: string;
  // material id
  materialId: string;
  // stocks location where to transfer from
  locationId?: string;
  // stocks loader where to transfer from
  loaderId?: string;
  status?: StockStatus;
  targetTransferredQuantity: number;
  unitId?: string;
};

export type CreateTransferCustomerOrderInput = {
  // customer to transfer stocks to
  customerId: string;
  createdBy?: string;
  description?: string;
  items: CreateTransferCustomerOrderItemInput[];
};

export type UpdateTransferCustomerOrderItemInput =
  Partial<CreateTransferCustomerOrderItemInput> & {
    id?: string;
    removedAt?: Date;
  };

export type UpdateTransferCustomerOrderInput = Partial<
  Omit<CreateTransferCustomerOrderInput, 'items'>
> & {
  id: string;
  removedAt?: Date;
  items?: UpdateTransferCustomerOrderItemInput[];
};
