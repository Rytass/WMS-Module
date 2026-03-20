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
import {
  useInventoryActions,
  useAddInventories,
} from '../../../inventoryActions/useInventoryActions';

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
  const { targetAction, setTargetAction } = useInventoryActions();
  const addInventories = useAddInventories();
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

  const onAddInventories = useCallback(
    (currentAction: InventoryActionItem | null) => {
      addInventories({
        targetStocks,
        currentAction,
        onAddSuccess: () => {
          setTargetStocks([]);
          setNeedClearSelectedRows(true);
          Message.success(`項目已加入${currentAction?.title}`);
        },
      });
    },
    [addInventories, setNeedClearSelectedRows, setTargetStocks, targetStocks],
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
          onAddInventories(targetAction);
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
        onAddInventories(currentAction);
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
