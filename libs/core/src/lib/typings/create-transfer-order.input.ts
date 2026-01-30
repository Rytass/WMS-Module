export type CreateTransferOrderItemInput = {
  // stocks location where to transfer from
  locationId: string;

  // stocks loader where to transfer from
  loaderId: string;
  quantity: number;
  unitId: string;
};

export type CreateTransferOrderInput = {
  // location to transfer stocks to
  locationId: string;
  // loader to transfer stocks to
  loaderId: string;
  receiver?: string;
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
  receiver?: string;
  description?: string;
  items?: UpdateTransferOrderItemInput[];
};
