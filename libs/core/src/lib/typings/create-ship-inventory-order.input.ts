import { StockStatus } from '../constants';

export type CreateShipInventoryOrderReferenceInput = {
  description?: string | null;
  unitId?: string | null;
  batchKey?: string | null;
  materialKey: string;
  targetShippedQuantity: number;
  serialId: string;
  saleId?: string | null;
  saleSerialId?: string | null;
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
  items?: UpdateShipInventoryOrderItemInput[];
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
  serialId: string;
  orderId: string;
};

export type UpdateShipInventoryOrderItemInput =
  Partial<CreateShipInventoryOrderItemInput> & {
    id?: string;
    removedAt?: Date;
  };

export type CreateShipInventoryOrderItemsInput = {
  orderId: string;
  items: CreateShipInventoryOrderItemInput[];
};
