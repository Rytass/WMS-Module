export type CreateShipInventoryOrderItemInput = {
  description?: string;
  unitId: string;
  batchId?: string;
  materialId: string;
  targetShippedQuantity: number;
};

export type CreateShipInventoryOrderInput = {
  key: string;
  description: string;
  items: CreateShipInventoryOrderItemInput[];
};

export type UpdateShipInventoryOrderItemInput =
  Partial<CreateShipInventoryOrderItemInput> & {
    id?: string;
    removedAt?: Date;
  };

export type UpdateShipInventoryOrderInput = Partial<
  Omit<CreateShipInventoryOrderInput, 'items'>
> & {
  id: string;
  items?: UpdateShipInventoryOrderItemInput[];
};
