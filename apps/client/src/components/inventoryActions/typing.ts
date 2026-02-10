export interface InventorySignatureValues {
  id: string;
  quantity: number;
  unitId: string | null;
}
export interface InventorySignature {
  [id: string]: InventorySignatureValues;
}
