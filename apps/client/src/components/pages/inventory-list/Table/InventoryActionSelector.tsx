import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from 'react';
import { uniq, intersection } from 'lodash';
import { ChevronDownIcon } from '@mezzanine-ui/icons';
import { Dropdown, Button, Message } from '@mezzanine-ui/react';
import { inventoryActionOptions } from '../../../../utils/inventoryActions';
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
    pushTargetInventoryIds,
  } = useInventoryActions();
  const [open, toggleOpen] = useState<boolean>(false);

  const availableOptions = useMemo(() => {
    const targetStatus = uniq(targetStocks.map((s) => s.status));

    return inventoryActionOptions.filter(
      (iao) =>
        intersection(iao.status, targetStatus).length === targetStatus.length,
    );
  }, [targetStocks]);

  const onAddInventoryIds = useCallback(() => {
    const duplicateItem = targetStocks.find((s) =>
      targetInventoryIds.includes(s.id),
    );
    const invalidStock = targetStocks.find(
      (stock) => targetAction && !targetAction.status.includes(stock.status),
    );

    if (duplicateItem) {
      Message.error(`料號：${duplicateItem.material.key} / 批號：${duplicateItem.batch.key} / 儲存位置：${duplicateItem.location.key}
此項目已在清單中，無法重複加入。`);
    } else if (invalidStock) {
      Message.error(`料號：${invalidStock.material.key} / 批號：${invalidStock.batch.key} / 儲存位置：${invalidStock.location.key}
無法執行作業：料號，資料不符作業條件。`);
    } else {
      pushTargetInventoryIds(targetStocks.map((s) => s.id));
      setTargetStocks([]);
      setNeedClearSelectedRows(true);
    }
  }, [
    setNeedClearSelectedRows,
    pushTargetInventoryIds,
    setTargetStocks,
    targetAction,
    targetInventoryIds,
    targetStocks,
  ]);

  if (targetAction) {
    return (
      <Button
        type="button"
        size="sub"
        icon={targetAction.icon}
        iconType="leading"
        disabled={targetStocks.length === 0}
        onClick={onAddInventoryIds}
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
        setTargetAction(
          inventoryActionOptions.find((o) => o.id === option.id) ?? null,
        );
        onAddInventoryIds();
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
        disabled={targetStocks.length === 0}
      >
        執行操作
      </Button>
    </Dropdown>
  );
}

export default InventoryActionSelector;
