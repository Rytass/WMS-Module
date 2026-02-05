import { Dispatch, SetStateAction, useMemo, useState } from 'react';
import { ChevronDownIcon } from '@mezzanine-ui/icons';
import { Dropdown, Button } from '@mezzanine-ui/react';
import {
  inventoryActionOptions,
  InventoryActions,
} from '../../../../utils/inventoryActions';

interface InventoryActionSelectorProps {
  currentAction: InventoryActions | null;
  setCurrentAction: Dispatch<SetStateAction<InventoryActions | null>>;
  disabled: boolean;
}

function InventoryActionSelector({
  currentAction,
  setCurrentAction,
  disabled,
}: InventoryActionSelectorProps) {
  const [open, toggleOpen] = useState<boolean>(false);

  const targetAction = useMemo(() => {
    return inventoryActionOptions.find((o) => o.id === currentAction) ?? null;
  }, [currentAction]);

  return (
    <Dropdown
      open={open}
      options={inventoryActionOptions}
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
          disabled={disabled}
        >
          執行操作
        </Button>
      )}
    </Dropdown>
  );
}

export default InventoryActionSelector;
