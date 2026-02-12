import { useState, memo, useCallback } from 'react';
import { omit } from 'lodash';
import { InventoryActionItem } from '../../utils/inventoryActions';
import { InventoryActionsContextProvider } from './InventoryActionsContext';
import { InventorySignature, ErrorSignature } from './typing';

const InventoryActionsProvider: FC = ({ children }) => {
  const [inventorySignature, setInventorySignature] =
    useState<InventorySignature>({});
  const [errorSignature, setErrorSignature] = useState<ErrorSignature>({});
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

  const updateInventoryQuantity = useCallback(
    (id: string, quantity: number) => {
      setInventorySignature((prevSignature) => ({
        ...prevSignature,
        [id]: {
          ...prevSignature[id],
          quantity,
        },
      }));
    },
    [],
  );

  const updateInventoryUnitId = useCallback(
    (id: string, unitId: string | null) => {
      setInventorySignature((prevSignature) => ({
        ...prevSignature,
        [id]: {
          ...prevSignature[id],
          unitId,
        },
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
    setErrorSignature((prevSignature) => omit(prevSignature, id));
  }, []);

  const updateErrorSignature = useCallback(
    (id: string, errorMessage: string) => {
      setErrorSignature((prevSignature) => ({
        ...prevSignature,
        [id]: errorMessage,
      }));
    },
    [],
  );

  const removeErrorSignature = useCallback((id: string) => {
    setErrorSignature((prevSignature) => omit(prevSignature, id));
  }, []);

  const resetAll = useCallback(() => {
    setInventorySignature({});
    setErrorSignature({});
    setTargetInventoryIds([]);
    setTargetAction(null);
  }, []);

  return (
    <InventoryActionsContextProvider
      value={{
        inventorySignature,
        targetInventoryIds,
        pushTargetInventoryIds,
        updateInventoryQuantity,
        updateInventoryUnitId,
        removeTargetInventory,
        resetAll,
        targetAction,
        setTargetAction,
        errorSignature,
        updateErrorSignature,
        removeErrorSignature,
      }}
    >
      {children}
    </InventoryActionsContextProvider>
  );
};

export default memo(InventoryActionsProvider);
