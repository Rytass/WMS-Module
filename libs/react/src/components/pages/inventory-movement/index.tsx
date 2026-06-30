import { parseAsString, useQueryState } from 'nuqs';
import PageWrapper from '../../PageWrapper';
import PageTabs from '../../PageTabs';
import InventoryMovementTransfer from './Transfer';
import InventoryMovementShip from './Ship';
import InventoryMovementReceive from './Receive';
import { PageTab } from './typing';

function InventoryMovement() {
  const [tab] = useQueryState('tab', parseAsString.withDefault(''));

  return (
    <PageWrapper title="庫存異動">
      <PageTabs
        tabs={[
          {
            id: PageTab.transfer,
            name: '調撥單',
          },
          {
            id: PageTab.ship,
            name: '出庫單',
          },
          {
            id: PageTab.receive,
            name: '入庫單',
          },
        ]}
      />
      {(tab === PageTab.transfer || !tab) && <InventoryMovementTransfer />}
      {tab === PageTab.ship && <InventoryMovementShip />}
      {tab === PageTab.receive && <InventoryMovementReceive />}
    </PageWrapper>
  );
}

export default InventoryMovement;
