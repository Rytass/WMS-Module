export type SplitBatchInput = {
  // original batch
  batchId: string;
  unitId?: string;
  items: {
    // target batch
    batchKey: string;
    quantity: number;
    locationId?: string;
    loaderId?: string;
  }[];
};
