import { useState, memo, useCallback } from 'react';
import { omit } from 'lodash';
import { InventoryActionItem } from '../../utils/inventoryActions';
import { InventoryActionsContextProvider } from './InventoryActionsContext';
import { InventorySignatureValues, InventorySignature } from './typing';

const InventoryActionsProvider: FC = ({ children }) => {
  const [inventorySignature, setInventorySignature] =
    useState<InventorySignature>({});
  const [targetInventoryIds, setTargetInventoryIds] = useState<string[]>([]);
  const [targetAction, setTargetAction] = useState<InventoryActionItem | null>(
    null,
  );

  const pushTargetInventoryIds = useCallback((ids: string[]) => {
    setTargetInventoryIds((prevIds) => [...prevIds, ...ids]);

    const currentSignature = ids.reduce(
      (prev, curr) => ({
        ...prev,
        [curr]: {
          id: curr,
          quantity: 0,
          unitId: null,
        },
      }),
      {},
    );
    setInventorySignature((prevSignature) => ({
      ...prevSignature,
      ...currentSignature,
    }));
  }, []);

  const updateInventorySignature = useCallback(
    (id: string, values: Omit<InventorySignatureValues, 'id'>) => {
      setInventorySignature((prevSignature) => ({
        ...prevSignature,
        [id]: { id, ...values },
      }));
    },
    [],
  );

  const removeTargetInventory = useCallback((id: string) => {
    setTargetInventoryIds((prevIds) => {
      const targetIndex = prevIds.findIndex((i) => i === id);

      return [
        ...prevIds.slice(0, targetIndex),
        ...prevIds.slice(targetIndex + 1),
      ];
    });

    setInventorySignature((prevSignature) => omit(prevSignature, id));
  }, []);

  const resetAll = useCallback(() => {
    setInventorySignature({});
    setTargetInventoryIds([]);
    setTargetAction(null);
  }, []);

  return (
    <InventoryActionsContextProvider
      value={{
        inventorySignature,
        targetInventoryIds,
        pushTargetInventoryIds,
        updateInventorySignature,
        removeTargetInventory,
        resetAll,
        targetAction,
        setTargetAction,
      }}
    >
      {children}
    </InventoryActionsContextProvider>
  );
};

export default memo(InventoryActionsProvider);
