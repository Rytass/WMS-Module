export type CreateShipInventoryOrderItemInput = {
  description: string;
  unitId: string;
  batchId: string;
  materialId: string;
  targetShippedQuantity: number;
  actualShippedQuantity: number;
};

export type CreateShipInventoryOrderInput = {
  id: string;
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
  items: UpdateShipInventoryOrderItemInput[];
};
