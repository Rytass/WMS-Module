import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from 'react';
import { isNumber, uniq, intersection } from 'lodash';
import { ChevronDownIcon } from '@mezzanine-ui/icons';
import { Dropdown, Button, Message } from '@mezzanine-ui/react';
import {
  InventoryActionItem,
  inventoryActionOptions,
} from '../../../inventoryActions/utils';
import { AggregatedStockFragment } from '../../../../graphql/generated/.graphql';
import { useInventoryActions } from '../../../inventoryActions/useInventoryActions';

interface InventoryActionSelectorProps {
  targetStocks: AggregatedStockFragment[];
  setTargetStocks: Dispatch<SetStateAction<AggregatedStockFragment[]>>;
  setNeedClearSelectedRows: Dispatch<SetStateAction<boolean>>;
}

function InventoryActionSelector({
  targetStocks,
  setTargetStocks,
  setNeedClearSelectedRows,
}: InventoryActionSelectorProps) {
  const {
    targetAction,
    setTargetAction,
    targetInventoryIds,
    pushTargetInventories,
  } = useInventoryActions();
  const [open, toggleOpen] = useState<boolean>(false);

  const availableOptions = useMemo(() => {
    const targetStatus = uniq(targetStocks.map((s) => s.status));

    return inventoryActionOptions.filter((iao) => {
      const baseCondition =
        intersection(iao.status, targetStatus).length === targetStatus.length;

      if (isNumber(iao.maxDataLength)) {
        return baseCondition && targetStocks.length <= iao.maxDataLength;
      }

      if (iao.needSameMaterial) {
        const targetStocksMaterialKeys = uniq(
          targetStocks.map((stock) => stock.material.key),
        );

        return baseCondition && targetStocksMaterialKeys.length === 1;
      }

      return baseCondition;
    });
  }, [targetStocks]);

  const onAddInventoryIds = useCallback(
    (currentAction: InventoryActionItem | null) => {
      const duplicateItem = targetStocks.find((s) =>
        targetInventoryIds.includes(s.id),
      );
      const invalidStock = targetStocks.find(
        (stock) =>
          currentAction && !currentAction.status.includes(stock.status),
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
        uniq(targetStocks.map((stock) => stock.material.key)).length !== 1
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
        setTargetStocks([]);
        setNeedClearSelectedRows(true);
        Message.success(`項目已加入${currentAction?.title}`);
      }
    },
    [
      setNeedClearSelectedRows,
      pushTargetInventories,
      setTargetStocks,
      targetInventoryIds,
      targetStocks,
    ],
  );

  if (targetAction) {
    return (
      <Button
        type="button"
        size="sub"
        icon={targetAction.icon}
        iconType="leading"
        disabled={targetStocks.length === 0}
        onClick={() => {
          onAddInventoryIds(targetAction);
        }}
      >
        {`加入${targetAction.title}`}
      </Button>
    );
  }

  return (
    <Dropdown
      open={open}
      options={availableOptions}
      onVisibilityChange={toggleOpen}
      onSelect={(option) => {
        const currentAction =
          inventoryActionOptions.find((o) => o.id === option.id) ?? null;
        setTargetAction(currentAction);
        onAddInventoryIds(currentAction);
        toggleOpen(false);
      }}
      placement="bottom-end"
      customWidth={240}
      zIndex={4}
    >
      <Button
        type="button"
        size="sub"
        icon={ChevronDownIcon}
        iconType="trailing"
        disabled={targetStocks.length === 0 || availableOptions.length === 0}
      >
        執行操作
      </Button>
    </Dropdown>
  );
}

export default InventoryActionSelector;
