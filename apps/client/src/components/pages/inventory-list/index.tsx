import { useState } from 'react';
import PageWrapper from '../../PageWrapper';
import InventoryTable from './Table';
import { InventoryActions } from '../../../utils/inventoryActions';

function InventoryList() {
  const [currentAction, setCurrentAction] = useState<InventoryActions | null>(
    null,
  );

  return (
    <PageWrapper title="庫存清單">
      <InventoryTable
        currentAction={currentAction}
        setCurrentAction={setCurrentAction}
      />
    </PageWrapper>
  );
}

export default InventoryList;
