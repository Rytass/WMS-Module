export type CreateReceiveInventoryOrderItemInput = {
  description?: string;
  unitId?: string;
  serialId: string;
  loaderKey?: string;
  locationKey?: string;
  batchKey: string;
  materialKey: string;
  targetReceivedQuantity: number;
  requireInspection?: boolean;
};

export type CreateReceiveInventoryOrderInput = {
  key: string;
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
  createdBy?: string;
  items?: UpdateReceiveInventoryOrderItemInput[];
  removedAt?: Date;
};
