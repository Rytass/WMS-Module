export interface InventorySignature {
  [id: string]: {
    id: string;
    quantity: number;
    unitId: string | null;
  };
}
