import { useMemo } from 'react';
import { useRouter } from 'next/router';
import PageWrapper from '../../PageWrapper';
import PageTabs from '../../PageTabs';
import LocationsManagementMap from './Map';
import LocationsManagementList from './List';
import { PageTab } from './typing';

function LocationsManagement() {
  const { query } = useRouter();
  const tab = useMemo(() => (query?.tab as PageTab) ?? '', [query.tab]);

  return (
    <PageWrapper title="庫位管理">
      <PageTabs
        tabs={[
          {
            id: PageTab.map,
            name: '庫位地圖',
          },
          {
            id: PageTab.list,
            name: '庫位清單',
          },
        ]}
      />
      {(tab === PageTab.map || !tab) && <LocationsManagementMap />}
      {tab === PageTab.list && <LocationsManagementList />}
    </PageWrapper>
  );
}

export default LocationsManagement;
