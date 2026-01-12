export type CreateReceiveInventoryOrderItemInput = {
  description: string;
  unitId: string;
  batchId: string;
  materialId: string;
  targetReceivedQuantity: number;
  actualReceivedQuantity: number;
};

export type CreateReceiveInventoryOrderInput = {
  id: string;
  description: string;
  items: CreateReceiveInventoryOrderItemInput[];
};

export type UpdateReceiveInventoryOrderItemInput =
  Partial<CreateReceiveInventoryOrderItemInput> & {
    id?: string;
    removedAt?: Date;
  };

export type UpdateReceiveInventoryOrderInput = Partial<
  Omit<CreateReceiveInventoryOrderInput, 'items'>
> & {
  id: string;
  items?: UpdateReceiveInventoryOrderItemInput[];
};
