export type InventoryFieldItem = {
  stockId: string;
  materialKey: string;
  batchKey: string;
  originQuantity: number;
  quantity: number;
  inputQuantity: string;
  selectedUnit: string;
  units: { id: string; name: string; conversionFactor: number }[];
};
