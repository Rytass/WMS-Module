export type MergeBatchInput = {
  // batch to be merged into
  batchKey: string;
  materialId: string;
  items: {
    batchId: string;
    locationId?: string;
    loaderId?: string;
    unitId?: string;
    quantity: number;
  }[];
};
