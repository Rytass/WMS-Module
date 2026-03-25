import { SelectValue } from '@mezzanine-ui/react';

export type ShipInventoryItemValues = {
  serialId: string;
  inventoryId: string;
  quantity: number;
  unitId: string | null;
};

export type ShipInventoryFieldValues = {
  shipInventoryOrder: SelectValue | null;
  description?: string;
  items: {
    [serialId: string]: ShipInventoryItemValues[];
  };
};
