import { useMemo } from 'react';
import { useRouter } from 'next/router';
import { NextPath } from '../../../../utils/nextpath';
import PageWrapper from '../../../PageWrapper';
import SectionWrapper from '../../../SectionWrapper';

function ViewReceiveInventoryOrder() {
  const { query } = useRouter();
  const id = useMemo(() => (query?.id as string) ?? '', [query.id]);

  return (
    <PageWrapper
      breadcrumb={[
        {
          label: '主檔管理',
          href: NextPath.RECEIVEINVENTORYORDERS,
        },
        {
          label: '入庫單',
          href: NextPath.RECEIVEINVENTORYORDERS,
        },
        {
          label: id,
        },
      ]}
      title={`入庫單號：${id}`}
      haveBack
      haveFooter
    >
      <SectionWrapper title="單號資訊">section1</SectionWrapper>
    </PageWrapper>
  );
}

export default ViewReceiveInventoryOrder;
