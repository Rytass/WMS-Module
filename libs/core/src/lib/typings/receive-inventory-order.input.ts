export type ReceiveInventoryOrderInput = {
  itemId: string;
  batchKey?: string;
  locationKey?: string;
  loaderKey?: string;
  quantity: number;
  inspectionResult?: boolean;
};
