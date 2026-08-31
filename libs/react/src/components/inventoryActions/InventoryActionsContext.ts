/* eslint-disable @typescript-eslint/no-empty-function */
import { createContext, Dispatch, SetStateAction } from 'react';
import {
  InventoryActionItem,
  InventoryActions,
  inventoryActionOptions,
} from './utils';
import { InventoryItem, InventorySignature, ErrorSignature } from './typing';

/** Fallback shown when an inventory action fails without a readable message. */
export const DEFAULT_INVENTORY_ACTION_ERROR_MESSAGE = '操作失敗，請稍後再試';

export interface InventoryActionsContextValues {
  inventorySignature: InventorySignature;
  targetInventories: InventoryItem[];
  targetInventoryIds: string[];
  pushTargetInventories: (inventories: InventoryItem[]) => void;
  updateInventoryQuantity: (id: string, quantity: number) => void;
  updateInventoryUnitId: (id: string, unitId: string | null) => void;
  removeTargetInventory: (id: string) => void;
  removeInventoryByIds: (ids: string[]) => void;
  resetAll: VoidFunction;
  targetAction: InventoryActionItem | null;
  setTargetAction: Dispatch<SetStateAction<InventoryActionItem | null>>;
  errorSignature: ErrorSignature;
  updateErrorSignature: (id: string, errorMessage: string) => void;
  removeErrorSignature: (id: string) => void;
  /**
   * The inventory actions this deployment enables, already filtered by the
   * `enabledActions` / `disabledActions` / `actionFilter` props given to
   * `InventoryActionsProvider`. Every action surface (the `InventoryList`
   * dropdown, the `LabelSearch` button row) must render from this list rather
   * than from the module-level {@link inventoryActionOptions}, so that all three
   * write surfaces stay consistent without per-page props.
   */
  availableActionOptions: InventoryActionItem[];
  /**
   * Whether a single action is enabled for this deployment. Used by the drawer
   * mount points so a disabled action can never be reached through a deep link
   * or leftover state.
   */
  isActionEnabled: (action: InventoryActions) => boolean;
  /**
   * Consumer-supplied error presentation. When provided it fully replaces the
   * built-in `Message.error` call, letting the host route failures into its own
   * notification system.
   */
  onError?: (action: InventoryActions, error: unknown) => void;
  /** Message shown when an error carries nothing human-readable. */
  errorMessageFallback: string;
}

export const InventoryActionsContext =
  createContext<InventoryActionsContextValues>({
    inventorySignature: {},
    targetInventories: [],
    targetInventoryIds: [],
    pushTargetInventories: () => {},
    updateInventoryQuantity: () => {},
    updateInventoryUnitId: () => {},
    removeTargetInventory: () => {},
    removeInventoryByIds: () => {},
    resetAll: () => {},
    targetAction: null,
    setTargetAction: () => {},
    errorSignature: {},
    updateErrorSignature: () => {},
    removeErrorSignature: () => {},
    // Defaults keep every action available: a consumer that renders an action
    // surface without the provider must behave exactly as it did before this
    // context gained a deployment dimension.
    availableActionOptions: inventoryActionOptions,
    isActionEnabled: () => true,
    errorMessageFallback: DEFAULT_INVENTORY_ACTION_ERROR_MESSAGE,
  });

export const InventoryActionsContextProvider = InventoryActionsContext.Provider;
