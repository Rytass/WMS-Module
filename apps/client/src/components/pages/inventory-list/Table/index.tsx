import { Dispatch, SetStateAction, useMemo, useState } from 'react';
import { ChevronDownIcon } from '@mezzanine-ui/icons';
import { Radio, RadioGroup, Dropdown, Button } from '@mezzanine-ui/react';
import TableWrapper from '../../../TableWrapper';
import InventoryGroupTable from './GroupTable';
import InventoryListTable from './ListTable';
import {
  inventoryActionOptions,
  InventoryActions,
} from '../../../../utils/inventoryActions';
import classes from './index.module.scss';

enum Mode {
  group = 'group',
  list = 'list',
}

interface InventoryTableProps {
  currentAction: InventoryActions | null;
  setCurrentAction: Dispatch<SetStateAction<InventoryActions | null>>;
}

function InventoryTable({
  currentAction,
  setCurrentAction,
}: InventoryTableProps) {
  const [mode, setMode] = useState<Mode>(Mode.group);

  const tableComponent = useMemo(() => {
    switch (mode) {
      case Mode.group:
        return <InventoryGroupTable />;

      case Mode.list:
        return <InventoryListTable />;

      default:
        return undefined;
    }
  }, [mode]);

  return (
    <TableWrapper
      title="庫存項目"
      otherActions={
        <div className={classes.actionsWrapper}>
          <RadioGroup
            size="sub"
            type="segment"
            value={mode}
            onChange={(e) => {
              setMode(e.target.value as Mode);
            }}
          >
            <Radio value={Mode.group} type="segment">
              料號模式
            </Radio>
            <Radio value={Mode.list} type="segment">
              攤平模式
            </Radio>
          </RadioGroup>
          <Dropdown
            options={inventoryActionOptions}
            onSelect={(option) => {
              setCurrentAction(option.id as InventoryActions);
            }}
            value={currentAction || undefined}
            placement="bottom-end"
            customWidth={240}
            zIndex={4}
          >
            <Button
              type="button"
              size="sub"
              icon={ChevronDownIcon}
              iconType="trailing"
            >
              執行操作
            </Button>
          </Dropdown>
        </div>
      }
    >
      {tableComponent}
    </TableWrapper>
  );
}

export default InventoryTable;
