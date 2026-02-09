/* eslint-disable @typescript-eslint/no-empty-function */
import { createContext, Dispatch, SetStateAction } from 'react';
import { InventoryActionItem } from '../../utils/inventoryActions';

export interface InventoryActionsContextValues {
  targetInventoryIds: string[];
  pushTargetInventoryIds: (ids: string[]) => void;
  clearTargetInventoryIds: VoidFunction;
  targetAction: InventoryActionItem | null;
  setTargetAction: Dispatch<SetStateAction<InventoryActionItem | null>>;
}

export const InventoryActionsContext =
  createContext<InventoryActionsContextValues>({
    targetInventoryIds: [],
    pushTargetInventoryIds: () => {},
    clearTargetInventoryIds: () => {},
    targetAction: null,
    setTargetAction: () => {},
  });

export const InventoryActionsContextProvider = InventoryActionsContext.Provider;
