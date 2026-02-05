export type CreateHoldInventoryOrderItemInput = {
  materialId: string;
  batchId: string;
  locationId?: string;
  loaderId?: string;
  unitId?: string;
  targetHeldQuantity: number;
};

export type CreateHoldInventoryOrderInput = {
  createdBy?: string;
  items: CreateHoldInventoryOrderItemInput[];
};

export type UpdateHoldInventoryOrderItemInput =
  Partial<CreateHoldInventoryOrderItemInput> & {
    id?: string;
    removedAt?: Date;
  };

export type UpdateHoldInventoryOrderInput = Partial<
  Omit<CreateHoldInventoryOrderInput, 'items'>
> & {
  id: string;
  removedAt?: Date;
  items?: UpdateHoldInventoryOrderItemInput[];
};
