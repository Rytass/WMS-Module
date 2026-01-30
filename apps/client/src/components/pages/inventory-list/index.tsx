import { useState, useMemo } from 'react';
import { Button } from '@mezzanine-ui/react';
import PageWrapper from '../../PageWrapper';
import InventoryTable from './Table';
import {
  inventoryActionOptions,
  InventoryActions,
} from '../../../utils/inventoryActions';
import classes from './index.module.scss';

function InventoryList() {
  const [currentAction, setCurrentAction] = useState<InventoryActions | null>(
    null,
  );

  const targetAction = useMemo(() => {
    return inventoryActionOptions.find((o) => o.id === currentAction) ?? null;
  }, [currentAction]);

  return (
    <PageWrapper
      title="庫存清單"
      titleButtons={
        targetAction ? (
          <Button
            icon={targetAction.icon}
            className={classes.actionButton}
            size="minor"
            iconType="icon-only"
            variant="base-secondary"
          />
        ) : undefined
      }
    >
      <InventoryTable
        currentAction={currentAction}
        setCurrentAction={setCurrentAction}
      />
    </PageWrapper>
  );
}

export default InventoryList;
