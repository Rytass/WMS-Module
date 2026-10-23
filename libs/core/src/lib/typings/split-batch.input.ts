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
     * Host-defined attributes for this child batch, applied **only when the
     * split creates it** — an existing `batchKey` is returned as it stands,
     * attributes and all.
     *
     * Children are distinguished by `batchKey`, never by attributes: `batches`
     * carries `UNIQUE (key, materialId)`, so one test run sorting a batch into
     * several grades gives each grade its own key and hangs the grade off it as
     * an attribute. Two items sharing a key is refused outright.
     */
    attributes?: Record<string, unknown> | null;
  }[];
};
