import { Dispatch, SetStateAction, useMemo, useState } from 'react';
import { uniq, intersection } from 'lodash';
import { ChevronDownIcon } from '@mezzanine-ui/icons';
import { Dropdown, Button } from '@mezzanine-ui/react';
import {
  inventoryActionOptions,
  InventoryActions,
} from '../../../../utils/inventoryActions';
import { AggregatedStockFragment } from '../../../../graphql/generated/.graphql';

interface InventoryActionSelectorProps {
  currentAction: InventoryActions | null;
  setCurrentAction: Dispatch<SetStateAction<InventoryActions | null>>;
  targetStocks: AggregatedStockFragment[];
}

function InventoryActionSelector({
  currentAction,
  setCurrentAction,
  targetStocks,
}: InventoryActionSelectorProps) {
  const [open, toggleOpen] = useState<boolean>(false);

  const targetAction = useMemo(() => {
    return inventoryActionOptions.find((o) => o.id === currentAction) ?? null;
  }, [currentAction]);

  const availableOptions = useMemo(() => {
    const targetStatus = uniq(targetStocks.map((s) => s.status));

    return inventoryActionOptions.filter(
      (iao) =>
        intersection(iao.status, targetStatus).length === targetStatus.length,
    );
  }, [targetStocks]);

  return (
    <Dropdown
      open={open}
      options={availableOptions}
      onVisibilityChange={toggleOpen}
      onSelect={(option) => {
        setCurrentAction(option.id as InventoryActions);
        toggleOpen(false);
      }}
      value={currentAction || undefined}
      placement="bottom-end"
      customWidth={240}
      zIndex={4}
    >
      {targetAction ? (
        <Button
          type="button"
          size="sub"
          icon={targetAction.icon}
          iconType="leading"
        >
          {`加入${targetAction.title}`}
        </Button>
      ) : (
        <Button
          type="button"
          size="sub"
          icon={ChevronDownIcon}
          iconType="trailing"
          disabled={targetStocks.length === 0}
        >
          執行操作
        </Button>
      )}
    </Dropdown>
  );
}

export default InventoryActionSelector;
