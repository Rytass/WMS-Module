import { Dispatch, SetStateAction, useMemo, useState } from 'react';
import { Radio, RadioGroup } from '@mezzanine-ui/react';
import { useRouter } from 'next/router';
import TableWrapper from '../../../TableWrapper';
import InventoryGroupTable from './GroupTable';
import InventoryListTable from './ListTable';
import { InventoryActions } from '../../../../utils/inventoryActions';
import InventoryActionSelector from './InventoryActionSelector';
import { StockFragment } from '../../../../graphql/generated/.graphql';
import { useDialog } from '../../../dialog/useDialog';
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
  targetStocks,
  setTargetStocks,
}: InventoryTableProps) {
  const [mode, setMode] = useState<Mode>(Mode.group);
  const { openDialog } = useDialog();
  const { replace, pathname } = useRouter();

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
            onChange={async (e) => {
              const doChange = () => {
                setMode(e.target.value as Mode);
                setTargetStocks([]);
                replace({ pathname: pathname, query: {} }, undefined, {
                  shallow: true,
                });
              };

              if (targetStocks.length > 0) {
                const isConfirm = await openDialog({
                  title: '切換模式將清除已選內容',
                  supportingText:
                    '已選內容尚未儲存，切換模式後將遺失目前進度。確認是否要切換模式嗎？',
                  cancelText: '繼續編輯',
                  confirmText: '切換模式',
                  confirmButtonProps: {
                    variant: 'destructive-primary',
                  },
                });

                if (isConfirm) {
                  doChange();
                }
              } else {
                doChange();
              }
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
