import { useContext } from 'react';
import {
  InventoryActionsContext,
  InventoryActionsContextValues,
} from './InventoryActionsContext';

export const useInventoryActions = (): InventoryActionsContextValues => {
  const context = useContext(InventoryActionsContext);

  return context;
};
