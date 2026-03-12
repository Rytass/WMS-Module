import { useMemo } from 'react';
import { useRouter } from 'next/router';
import PageWrapper from '../../PageWrapper';
import PageTabs from '../../PageTabs';
import { PageTab } from './typing';

function InventoryMovement() {
  const { query } = useRouter();
  const tab = useMemo(() => (query?.tab as PageTab) ?? '', [query.tab]);

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
      {(tab === PageTab.transfer || !tab) && <div>調撥單</div>}
      {tab === PageTab.ship && <div>出庫單</div>}
      {tab === PageTab.receive && <div>入庫單</div>}
    </PageWrapper>
  );
}

export default InventoryMovement;
