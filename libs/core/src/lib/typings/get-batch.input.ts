export type GetBatchInput = {
  key: string;
  materialId: string;
  groupId?: string;
  saleId?: string | null;
  saleSerialId?: string | null;
  customerId?: string | null;
  vendorId?: string | null;
  inspectionId?: string | null;
};
