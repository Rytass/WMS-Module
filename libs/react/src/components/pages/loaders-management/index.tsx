import { parseAsString, useQueryState } from 'nuqs';
import PageWrapper from '../../PageWrapper';
import PageTabs from '../../PageTabs';
import LoadersManagementList from './List';
import LoadersManagementTypes from './Types';
import { PageTab } from './typing';

function LoadersManagement() {
  const [tab] = useQueryState('tab', parseAsString.withDefault(''));

  return (
    <PageWrapper title="載具管理">
      <PageTabs
        tabs={[
          {
            id: PageTab.list,
            name: '載具清單',
          },
          {
            id: PageTab.type,
            name: '載具類型',
          },
        ]}
      />
      {(tab === PageTab.list || !tab) && <LoadersManagementList />}
      {tab === PageTab.type && <LoadersManagementTypes />}
    </PageWrapper>
  );
}

export default LoadersManagement;
