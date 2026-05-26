import { useMemo, useState, memo, useCallback } from 'react';
import { omit } from 'lodash';
import { InventoryActionItem } from './utils';
import { InventoryActionsContextProvider } from './InventoryActionsContext';
import { InventoryItem, InventorySignature, ErrorSignature } from './typing';

const InventoryActionsProvider: FC = ({ children }) => {
  const [inventorySignature, setInventorySignature] =
    useState<InventorySignature>({});
  const [errorSignature, setErrorSignature] = useState<ErrorSignature>({});
  const [targetInventories, setTargetInventories] = useState<InventoryItem[]>(
    [],
  );
  const [targetAction, setTargetAction] = useState<InventoryActionItem | null>(
    null,
  );

  const targetInventoryIds = useMemo(
    () => targetInventories.map((i) => i.id),
    [targetInventories],
  );

  const pushTargetInventories = useCallback((inventories: InventoryItem[]) => {
    setTargetInventories((prevInventories) => [
      ...prevInventories,
      ...inventories,
    ]);

    const currentSignature = inventories.reduce(
      (prev, curr) => ({
        ...prev,
        [curr.id]: {
          id: curr.id,
          quantity: curr.maxQuantityByDefaultUnit,
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
    setTargetInventories((prevInventories) => {
      const targetIndex = prevInventories.findIndex((i) => i.id === id);

      return [
        ...prevInventories.slice(0, targetIndex),
        ...prevInventories.slice(targetIndex + 1),
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

  const removeInventoryByIds = useCallback((ids: string[]) => {
    setInventorySignature((prevSignature) => omit(prevSignature, ids));
    setErrorSignature((prevSignature) => omit(prevSignature, ids));
    setTargetInventories((prevInventories) =>
      prevInventories.filter((i) => !ids.includes(i.id)),
    );
  }, []);

  const resetAll = useCallback(() => {
    setInventorySignature({});
    setErrorSignature({});
    setTargetInventories([]);
    setTargetAction(null);
  }, []);

  return (
    <InventoryActionsContextProvider
      value={{
        inventorySignature,
        targetInventories,
        targetInventoryIds,
        pushTargetInventories,
        updateInventoryQuantity,
        updateInventoryUnitId,
        removeTargetInventory,
        removeInventoryByIds,
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
