export type SplitBatchInput = {
  saleId?: string | null;
  saleSerialId?: string | null;
  customerId?: string | null;
  vendorId?: string | null;
  inspectionId?: string | null;
  transferId?: string | null;
  held?: boolean;
  inShipment?: boolean;
};
export type GetBatchInput = {
  key: string;
  materialId: string;
};
