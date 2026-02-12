/* eslint-disable @typescript-eslint/no-empty-function */
import { createContext, Dispatch, SetStateAction } from 'react';
import { InventoryActionItem } from '../../utils/inventoryActions';
import { InventorySignature, ErrorSignature } from './typing';

export interface InventoryActionsContextValues {
  inventorySignature: InventorySignature;
  targetInventoryIds: string[];
  pushTargetInventoryIds: (ids: string[]) => void;
  updateInventoryQuantity: (id: string, quantity: number) => void;
  updateInventoryUnitId: (id: string, unitId: string | null) => void;
  removeTargetInventory: (id: string) => void;
  resetAll: VoidFunction;
  targetAction: InventoryActionItem | null;
  setTargetAction: Dispatch<SetStateAction<InventoryActionItem | null>>;
  errorSignature: ErrorSignature;
  updateErrorSignature: (id: string, errorMessage: string) => void;
}

export const InventoryActionsContext =
  createContext<InventoryActionsContextValues>({
    inventorySignature: {},
    targetInventoryIds: [],
    pushTargetInventoryIds: () => {},
    updateInventoryQuantity: () => {},
    updateInventoryUnitId: () => {},
    removeTargetInventory: () => {},
    resetAll: () => {},
    targetAction: null,
    setTargetAction: () => {},
    errorSignature: {},
    updateErrorSignature: () => {},
  });

export const InventoryActionsContextProvider = InventoryActionsContext.Provider;
