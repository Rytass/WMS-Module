import { Dispatch, SetStateAction, useMemo, useState } from 'react';
import { Button, Radio, RadioGroup } from '@mezzanine-ui/react';
import { useRouter } from 'next/router';
import TableWrapper from '../../../TableWrapper';
import InventoryGroupTable from './GroupTable';
import InventoryListTable from './ListTable';
import InventoryActionSelector from './InventoryActionSelector';
import { AggregatedStockFragment } from '../../../../graphql/generated/.graphql';
import { useDialog } from '../../../dialog/useDialog';
import InventoryActionDrawers from '../../../InventoryActionDrawers';
import { useInventoryActions } from '../../../inventoryActions/useInventoryActions';
import { FilterValues } from '../typing';
import classes from './index.module.scss';

enum Mode {
  group = 'group',
  list = 'list',
}

interface InventoryTableProps {
  currentFilter?: FilterValues;
  setCurrentFilter: Dispatch<SetStateAction<FilterValues | undefined>>;
  onlyListMode?: boolean;
}

function InventoryTable({
  currentFilter,
  setCurrentFilter,
  onlyListMode = false,
}: InventoryTableProps) {
  const { openDialog } = useDialog();
  const { replace, pathname } = useRouter();
  const { targetAction, targetInventoryIds } = useInventoryActions();

  const [mode, setMode] = useState<Mode>(onlyListMode ? Mode.list : Mode.group);
  const [open, setOpen] = useState<boolean>(false);
  const [needClearSelectedRows, setNeedClearSelectedRows] =
    useState<boolean>(false);

  const [targetStocks, setTargetStocks] = useState<AggregatedStockFragment[]>(
    [],
  );

  const tableComponent = useMemo(() => {
    switch (mode) {
      case Mode.group:
        return (
          <InventoryGroupTable
            currentFilter={currentFilter}
            setTargetStocks={setTargetStocks}
            needClearSelectedRows={needClearSelectedRows}
            setNeedClearSelectedRows={setNeedClearSelectedRows}
          />
        );

      case Mode.list:
        return (
          <InventoryListTable
            currentFilter={currentFilter}
            setTargetStocks={setTargetStocks}
            needClearSelectedRows={needClearSelectedRows}
            setNeedClearSelectedRows={setNeedClearSelectedRows}
          />
        );

      default:
        return undefined;
    }
  }, [
    currentFilter,
    mode,
    setTargetStocks,
    needClearSelectedRows,
    setNeedClearSelectedRows,
  ]);

  return (
    <>
      <TableWrapper
        title="庫存項目"
        otherActions={
          <div className={classes.actionsWrapper}>
            {!onlyListMode && (
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
            )}
            <InventoryActionSelector
              targetStocks={targetStocks}
              setTargetStocks={setTargetStocks}
              setNeedClearSelectedRows={setNeedClearSelectedRows}
            />
          </div>
        }
      >
        {tableComponent}
      </TableWrapper>
      {targetAction && targetInventoryIds.length > 0 ? (
        <Button
          icon={targetAction.icon}
          className={classes.actionButton}
          iconType="icon-only"
          variant="base-secondary"
          onClick={() => {
            setOpen(true);
          }}
        />
      ) : null}

      <InventoryActionDrawers
        onClose={() => {
          setOpen(false);
        }}
        open={open}
        setCurrentFilter={setCurrentFilter}
      />
    </>
  );
}

export default InventoryTable;
