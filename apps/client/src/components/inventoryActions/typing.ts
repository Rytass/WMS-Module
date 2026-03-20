export interface InventoryItem {
  id: string;
  material: {
    id: string;
    key: string;
  };
}

export interface InventorySignatureValues {
  id: string;
  quantity: number;
  unitId: string | null;
}
export interface InventorySignature {
  [id: string]: InventorySignatureValues;
}

export interface ErrorSignature {
  [id: string]: string;
}
