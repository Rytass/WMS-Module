import { useState, memo } from 'react';
import { InventoryActionItem } from '../../utils/inventoryActions';
import { InventoryActionsContextProvider } from './InventoryActionsContext';

const InventoryActionsProvider: FC = ({ children }) => {
  const [targetInventoryIds, setTargetInventoryIds] = useState<string[]>([]);
  const [targetAction, setTargetAction] = useState<InventoryActionItem | null>(
    null,
  );

  return (
    <InventoryActionsContextProvider
      value={{
        targetInventoryIds,
        targetAction,
      }}
    >
      {children}
    </InventoryActionsContextProvider>
  );
};

export default memo(InventoryActionsProvider);
