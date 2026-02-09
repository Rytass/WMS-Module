import { useState, memo, useCallback } from 'react';
import { InventoryActionItem } from '../../utils/inventoryActions';
import { InventoryActionsContextProvider } from './InventoryActionsContext';

const InventoryActionsProvider: FC = ({ children }) => {
  const [targetInventoryIds, setTargetInventoryIds] = useState<string[]>([]);
  const [targetAction, setTargetAction] = useState<InventoryActionItem | null>(
    null,
  );

  const pushTargetInventoryIds = useCallback((ids: string[]) => {
    setTargetInventoryIds((prev) => [...prev, ...ids]);
  }, []);

  const clearTargetInventoryIds = useCallback(() => {
    setTargetInventoryIds([]);
  }, []);

  return (
    <InventoryActionsContextProvider
      value={{
        targetInventoryIds,
        pushTargetInventoryIds,
        clearTargetInventoryIds,
        targetAction,
        setTargetAction,
      }}
    >
      {children}
    </InventoryActionsContextProvider>
  );
};

export default memo(InventoryActionsProvider);
