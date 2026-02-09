/* eslint-disable @typescript-eslint/no-empty-function */
import { createContext, Dispatch, SetStateAction } from 'react';
import { InventoryActionItem } from '../../utils/inventoryActions';

export interface InventoryActionsContextValues {
  targetInventoryIds: string[];
  setTargetInventoryIds: Dispatch<SetStateAction<string[]>>;
  targetAction: InventoryActionItem | null;
  setTargetAction: Dispatch<SetStateAction<InventoryActionItem | null>>;
}

export const InventoryActionsContext =
  createContext<InventoryActionsContextValues>({
    targetInventoryIds: [],
    setTargetInventoryIds: () => {},
    targetAction: null,
    setTargetAction: () => {},
  });

export const InventoryActionsContextProvider = InventoryActionsContext.Provider;
