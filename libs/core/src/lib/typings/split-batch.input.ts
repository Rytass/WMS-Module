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
    /**
     * Host-defined attributes for this child batch, applied when the split
     * creates it. One split order can therefore produce several children that
     * differ only by their attributes — the shape a host needs when one test
     * run sorts a batch into several grades at once.
     */
    attributes?: Record<string, unknown> | null;
  }[];
};
