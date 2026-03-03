import { StockStatus } from '../constants';

export type CreateAllocateInventoryOrderItemInput = {
  materialId: string;
  batchId: string;
  locationId?: string;
  loaderId?: string;
  unitId?: string;
  status?: StockStatus;
  targetAllocatedQuantity: number;
};

export type CreateAllocateInventoryOrderInput = {
  createdBy?: string;
  items: CreateAllocateInventoryOrderItemInput[];
};

export type UpdateAllocateInventoryOrderItemInput =
  Partial<CreateAllocateInventoryOrderItemInput> & {
    id?: string;
    removedAt?: Date;
  };

export type UpdateAllocateInventoryOrderInput = Partial<
  Omit<CreateAllocateInventoryOrderInput, 'items'>
> & {
  id: string;
  removedAt?: Date;
  items?: UpdateAllocateInventoryOrderItemInput[];
};
