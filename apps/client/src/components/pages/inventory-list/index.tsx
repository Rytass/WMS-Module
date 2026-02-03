import { useState, useMemo } from 'react';
import { Button } from '@mezzanine-ui/react';
import PageWrapper from '../../PageWrapper';
import InventoryTable from './Table';
import {
  inventoryActionOptions,
  InventoryActions,
} from '../../../utils/inventoryActions';
import { AggregatedStockFragment } from '../../../graphql/generated/.graphql';
import classes from './index.module.scss';

function InventoryList() {
  const [open, setOpen] = useState<boolean>(false);

  const [targetStocks, setTargetStocks] = useState<AggregatedStockFragment[]>(
    [],
  );
  const [currentAction, setCurrentAction] = useState<InventoryActions | null>(
    null,
  );

  console.log('targetStocks', targetStocks);

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
              setOpen(true);
            }}
          />
        ) : null}
      </PageWrapper>
    </>
  );
}

export default InventoryList;
