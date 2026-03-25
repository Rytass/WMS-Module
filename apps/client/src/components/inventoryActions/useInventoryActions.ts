import { useMemo, useContext, useCallback } from 'react';
import { isNumber, uniq } from 'lodash';
import { Message } from '@mezzanine-ui/react';
import {
  InventoryActionsContext,
  InventoryActionsContextValues,
} from './InventoryActionsContext';
import { AggregatedStockFragment } from '../../graphql/generated/.graphql';
import { BASE_UNIT } from '../../utils/share';
import {
  InventoryActionItem,
  getQuantityWithUnitId,
  getMaterialUnitOptions,
} from './utils';

export const useInventoryActions = (): InventoryActionsContextValues => {
  const context = useContext(InventoryActionsContext);

  return context;
};

export const useAddInventories = () => {
  const { targetInventoryIds, targetInventories, pushTargetInventories } =
    useInventoryActions();

  const addInventories = useCallback(
    ({
      targetStocks,
      currentAction,
      onAddSuccess,
    }: {
      targetStocks: AggregatedStockFragment[];
      currentAction: InventoryActionItem | null;
      onAddSuccess: VoidFunction;
    }) => {
      const duplicateItem = targetStocks.find((s) =>
        targetInventoryIds.includes(s.id),
      );
      const invalidStock = targetStocks.find(
        (stock) =>
          currentAction && !currentAction.status.includes(stock.status),
      );
      const targetStocksMaterialKeys = uniq(
        targetStocks.map((stock) => stock.material.key),
      );

      if (duplicateItem) {
        Message.error(`料號：${duplicateItem.material.key} / 批號：${duplicateItem.batch.key} / 儲存位置：${duplicateItem.location.key}
此項目已在清單中，無法重複加入。`);
      } else if (invalidStock) {
        Message.error(`料號：${invalidStock.material.key} / 批號：${invalidStock.batch.key} / 儲存位置：${invalidStock.location.key}
無法執行作業：料號，資料不符作業條件。`);
      } else if (
        currentAction &&
        isNumber(currentAction.maxDataLength) &&
        targetStocks.length + targetInventoryIds.length >
          currentAction.maxDataLength
      ) {
        Message.warning(
          `${currentAction.submitText}僅能選取${currentAction.maxDataLength}個項目`,
        );
      } else if (
        currentAction &&
        currentAction.needSameMaterial &&
        (targetStocksMaterialKeys.length > 1 ||
          (targetInventories.length > 0 &&
            !uniq(targetInventories.map((i) => i.material.key)).includes(
              targetStocksMaterialKeys[0],
            )))
      ) {
        Message.warning(`${currentAction.submitText}僅能選取相同料號`);
      } else {
        pushTargetInventories(
          targetStocks.map((s) => ({
            id: s.id,
            material: {
              id: s.material.id,
              key: s.material.key,
            },
          })),
        );

        onAddSuccess();
      }
    },
    [pushTargetInventories, targetInventories, targetInventoryIds],
  );

  return addInventories;
};

export function useInventorySignature(inventory: AggregatedStockFragment) {
  const { inventorySignature } = useInventoryActions();

  const currentSignature = useMemo(
    () => inventorySignature[inventory.id],
    [inventory.id, inventorySignature],
  );

  const saleInformation = useMemo(
    () =>
      `${inventory.saleId}${inventory.saleSerialId ? `-${inventory.saleSerialId}` : ''}`,
    [inventory.saleId, inventory.saleSerialId],
  );

  const currentUnitId = useMemo(() => {
    return currentSignature?.unitId;
  }, [currentSignature?.unitId]);

  const unitOptions = useMemo(
    () => getMaterialUnitOptions(inventory.material),
    [inventory.material],
  );

  const currentUnitName = useMemo(() => {
    return (
      unitOptions.find((o) => o.id === (currentUnitId || BASE_UNIT))?.name ?? ''
    );
  }, [currentUnitId, unitOptions]);

  const quantity = useMemo(() => {
    return getQuantityWithUnitId({
      inventory,
      currentUnitId,
    });
  }, [currentUnitId, inventory]);

  const inputQuantity = useMemo(
    () => currentSignature?.quantity,
    [currentSignature?.quantity],
  );

  return {
    currentSignature,
    saleInformation,
    currentUnitId,
    unitOptions,
    currentUnitName,
    quantity,
    inputQuantity,
  };
}
