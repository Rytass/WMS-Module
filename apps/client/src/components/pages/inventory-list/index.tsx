import { useState, useMemo } from 'react';
import { Button, Message } from '@mezzanine-ui/react';
import PageWrapper from '../../PageWrapper';
import InventoryTable from './Table';
import {
  inventoryActionOptions,
  InventoryActions,
} from '../../../utils/inventoryActions';
import { AggregatedStockFragment } from '../../../graphql/generated/.graphql';
import classes from './index.module.scss';
import InventoryActionDrawers from '../../InventoryActionDrawers';

function InventoryList() {
  const [open, setOpen] = useState<boolean>(false);

  const [targetStocks, setTargetStocks] = useState<AggregatedStockFragment[]>(
    [],
  );
  const [currentAction, setCurrentAction] = useState<InventoryActions | null>(
    null,
  );

  const targetAction = useMemo(() => {
    return inventoryActionOptions.find((o) => o.id === currentAction) ?? null;
  }, [currentAction]);

  return (
    <>
      <PageWrapper title="庫存清單">
        <InventoryTable
          currentAction={currentAction}
          setCurrentAction={setCurrentAction}
          targetStocks={targetStocks}
          setTargetStocks={setTargetStocks}
        />
        {targetAction ? (
          <Button
            icon={targetAction.icon}
            className={classes.actionButton}
            iconType="icon-only"
            variant="base-secondary"
            onClick={() => {
              const invalidStock = targetStocks.find(
                (stock) => !targetAction.status.includes(stock.status),
              );

              if (invalidStock) {
                Message.error(`料號：${invalidStock.material.key} / 批號：${invalidStock.batch.key} / 儲存位置：${invalidStock.location.key}
無法執行作業：料號，資料不符作業條件。`);
              } else {
                setOpen(true);
              }
            }}
          />
        ) : null}
      </PageWrapper>
      <InventoryActionDrawers
        targetAction={targetAction}
        targetStocks={targetStocks}
        onClose={() => {
          setOpen(false);
        }}
        open={open}
      />
    </>
  );
}

export default InventoryList;
