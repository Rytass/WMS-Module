export type ReclassifyInventoryOrderInput = {
  materialKey: string;
  items: {
    quantity: number;
    materialId: string;
    batchId: string;
    locationId?: string;
    loaderId?: string;
    unitId?: string;
  }[];
};
