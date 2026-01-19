import { useMemo } from 'react';
import { useRouter } from 'next/router';
import PageWrapper from '../../PageWrapper';
import PageTabs from '../../PageTabs';
import { PageTab } from './typing';

function LoadersManagement() {
  const { query } = useRouter();
  const tab = useMemo(() => (query?.tab as PageTab) ?? '', [query.tab]);

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
    </PageWrapper>
  );
}

export default LoadersManagement;
