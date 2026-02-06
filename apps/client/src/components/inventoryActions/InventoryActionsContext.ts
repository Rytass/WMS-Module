import { createContext } from 'react';
import { InventoryActionItem } from '../../utils/inventoryActions';

export interface InventoryActionsContextValues {
  targetInventoryIds: string[];
  targetAction: InventoryActionItem | null;
}

export const InventoryActionsContext =
  createContext<InventoryActionsContextValues>({
    targetInventoryIds: [],
    targetAction: null,
  });

export const InventoryActionsContextProvider = InventoryActionsContext.Provider;
