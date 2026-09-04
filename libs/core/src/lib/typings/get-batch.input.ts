export type SplitBatchInput = {
  saleId?: string | null;
  saleSerialId?: string | null;
  customerId?: string | null;
  vendorId?: string | null;
  inspectionResult?: boolean | null;
  transferId?: string | null;
  held?: boolean;
  inShipment?: boolean;
  /**
   * Host-defined attributes for the child batch. Part of the batch's identity
   * for the purposes of reuse: a split asking for attributes the existing
   * sibling does not carry produces a new batch rather than reusing it.
   */
  attributes?: Record<string, unknown> | null;
};
export type GetBatchInput = {
  key: string;
  materialId: string;
  /**
   * Recorded on the batch when this call creates it. Ignored when an existing
   * batch with the same key is reused — `parentBatchId` is written once and
   * never rewritten.
   */
  parentBatchId?: string | null;
  /** Applied when this call creates the batch; ignored when one is reused. */
  attributes?: Record<string, unknown> | null;
};
