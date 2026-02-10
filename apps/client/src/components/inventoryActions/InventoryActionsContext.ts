/* eslint-disable @typescript-eslint/no-empty-function */
import { createContext, Dispatch, SetStateAction } from 'react';
import { InventoryActionItem } from '../../utils/inventoryActions';
import { InventorySignatureValues, InventorySignature } from './typing';

export interface InventoryActionsContextValues {
  inventorySignature: InventorySignature;
  targetInventoryIds: string[];
  pushTargetInventoryIds: (ids: string[]) => void;
  updateInventorySignature: (
    id: string,
    values: Omit<InventorySignatureValues, 'id'>,
  ) => void;
  removeTargetInventory: (id: string) => void;
  resetAll: VoidFunction;
  targetAction: InventoryActionItem | null;
  setTargetAction: Dispatch<SetStateAction<InventoryActionItem | null>>;
}

export const InventoryActionsContext =
  createContext<InventoryActionsContextValues>({
    inventorySignature: {},
    targetInventoryIds: [],
    pushTargetInventoryIds: () => {},
    updateInventorySignature: () => {},
    removeTargetInventory: () => {},
    resetAll: () => {},
    targetAction: null,
    setTargetAction: () => {},
  });

export const InventoryActionsContextProvider = InventoryActionsContext.Provider;
