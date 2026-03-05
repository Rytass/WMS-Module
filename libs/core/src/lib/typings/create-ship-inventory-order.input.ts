import { StockStatus } from '../constants';

export type CreateShipInventoryOrderReferenceInput = {
  description?: string;
  unitId?: string;
  batchKey?: string;
  materialKey: string;
  targetShippedQuantity: number;
  serialId: number;
};

export type CreateShipInventoryOrderInput = {
  key: string;
  description: string;
  references: CreateShipInventoryOrderReferenceInput[];
};

export type UpdateShipInventoryOrderReferenceInput =
  Partial<CreateShipInventoryOrderReferenceInput> & {
    id?: string;
    removedAt?: Date;
  };

export type UpdateShipInventoryOrderInput = Partial<
  Omit<CreateShipInventoryOrderInput, 'references'>
> & {
  id: string;
  createdBy?: string;
  references?: UpdateShipInventoryOrderReferenceInput[];
  removedAt?: Date;
};

export type CreateShipInventoryOrderItemInput = {
  materialId: string;
  batchId: string;
  locationId?: string;
  loaderId?: string;
  unitId?: string;
  targetShippedQuantity: number;
  status: StockStatus;
  serialId: number;
};

export type CreateShipInventoryOrderItemsInput = {
  orderId: string;
  items: CreateShipInventoryOrderItemInput[];
};
