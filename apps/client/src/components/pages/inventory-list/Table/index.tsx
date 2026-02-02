import { Dispatch, SetStateAction, useMemo, useState } from 'react';
import { Radio, RadioGroup } from '@mezzanine-ui/react';
import TableWrapper from '../../../TableWrapper';
import InventoryGroupTable from './GroupTable';
import InventoryListTable from './ListTable';
import { InventoryActions } from '../../../../utils/inventoryActions';
import InventoryActionSelector from './InventoryActionSelector';
import { StockFragment } from '../../../../graphql/generated/.graphql';
import classes from './index.module.scss';

enum Mode {
  group = 'group',
  list = 'list',
}

interface InventoryTableProps {
  currentAction: InventoryActions | null;
  setCurrentAction: Dispatch<SetStateAction<InventoryActions | null>>;
  targetStocks: StockFragment[];
  setTargetStocks: Dispatch<SetStateAction<StockFragment[]>>;
}

function InventoryTable({
  currentAction,
  setCurrentAction,
  setTargetStocks,
}: InventoryTableProps) {
  const [mode, setMode] = useState<Mode>(Mode.group);

  const tableComponent = useMemo(() => {
    switch (mode) {
      case Mode.group:
        return <InventoryGroupTable />;

      case Mode.list:
        return <InventoryListTable setTargetStocks={setTargetStocks} />;

      default:
        return undefined;
    }
  }, [mode, setTargetStocks]);

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
          <InventoryActionSelector
            currentAction={currentAction}
            setCurrentAction={setCurrentAction}
          />
        </div>
      }
    >
      {tableComponent}
    </TableWrapper>
  );
}

export default InventoryTable;
