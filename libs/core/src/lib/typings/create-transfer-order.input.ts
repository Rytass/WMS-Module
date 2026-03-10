import { StockStatus } from '../constants';

export type CreateTransferOrderItemInput = {
  // stocks location where to transfer from
  locationId: string;

  // stocks loader where to transfer from
  loaderId?: string;
  status?: StockStatus;
  targetTransferredQuantity: number;
  unitId?: string;
};

export type CreateTransferOrderInput = {
  // location to transfer stocks to
  locationId: string;
  // loader to transfer stocks to
  loaderId?: string;
  receiver?: string;
  createdBy?: string;
  description?: string;
  items: CreateTransferOrderItemInput[];
};

export type UpdateTransferOrderItemInput =
  Partial<CreateTransferOrderItemInput> & {
    id?: string;
    removedAt?: Date;
  };

export type UpdateTransferOrderInput = Partial<
  Omit<CreateTransferOrderInput, 'items'>
> & {
  id: string;
  removedAt?: Date;
  items?: UpdateTransferOrderItemInput[];
};
