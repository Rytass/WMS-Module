export type CreateInspectionOrderInput = {
  key: string;
  note?: string;
  items: CreateInspectionOrderItemInput[];
};
export type CreateInspectionOrderItemInput = {
  materialId: string;
  batchId: string;
  locationId?: string;
  loaderId?: string;
  unitId?: string;
  quantity: number;
  inspectionResult: boolean;
};
