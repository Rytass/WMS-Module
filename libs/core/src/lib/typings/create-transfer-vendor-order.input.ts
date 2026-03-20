import { StockStatus } from '../constants';

export type CreateTransferVendorOrderItemInput = {
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

export type CreateTransferVendorOrderInput = {
  // vendor to transfer stocks to
  vendorId: string;
  createdBy?: string;
  description?: string;
  items: CreateTransferVendorOrderItemInput[];
};

export type UpdateTransferVendorOrderItemInput =
  Partial<CreateTransferVendorOrderItemInput> & {
    id?: string;
    removedAt?: Date;
  };

export type UpdateTransferVendorOrderInput = Partial<
  Omit<CreateTransferVendorOrderInput, 'items'>
> & {
  id: string;
  removedAt?: Date;
  items?: UpdateTransferVendorOrderItemInput[];
};
