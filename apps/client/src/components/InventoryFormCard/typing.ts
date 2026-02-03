export type InventoryFieldItem = {
  stockId: string;
  materialKey: string;
  batchKey: string;
  quantity: number;
  inputQuantity: string;
  selectedUnit: string;
  units: { id: string; name: string; conversionFactor: number }[];
};
