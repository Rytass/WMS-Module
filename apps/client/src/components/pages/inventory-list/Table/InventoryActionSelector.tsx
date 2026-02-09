import { useMemo, useState } from 'react';
import { uniq, intersection } from 'lodash';
import { ChevronDownIcon } from '@mezzanine-ui/icons';
import { Dropdown, Button } from '@mezzanine-ui/react';
import { inventoryActionOptions } from '../../../../utils/inventoryActions';
import { AggregatedStockFragment } from '../../../../graphql/generated/.graphql';
import { useInventoryActions } from '../../../inventoryActions/useInventoryActions';

interface InventoryActionSelectorProps {
  targetStocks: AggregatedStockFragment[];
}

function InventoryActionSelector({
  targetStocks,
}: InventoryActionSelectorProps) {
  const { targetAction, setTargetAction } = useInventoryActions();
  const [open, toggleOpen] = useState<boolean>(false);

  const availableOptions = useMemo(() => {
    const targetStatus = uniq(targetStocks.map((s) => s.status));

    return inventoryActionOptions.filter(
      (iao) =>
        intersection(iao.status, targetStatus).length === targetStatus.length,
    );
  }, [targetStocks]);

  if (targetAction) {
    return (
      <Button
        type="button"
        size="sub"
        icon={targetAction.icon}
        iconType="leading"
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
