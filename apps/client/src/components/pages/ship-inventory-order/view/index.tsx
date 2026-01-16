import { useMemo } from 'react';
import { useRouter } from 'next/router';
import { NextPath } from '../../../../utils/nextpath';
import PageWrapper from '../../../PageWrapper';
import SectionWrapper from '../../../SectionWrapper';

function ViewShipInventoryOrder() {
  const { query } = useRouter();
  const id = useMemo(() => (query?.id as string) ?? '', [query.id]);

  return (
    <PageWrapper
      breadcrumb={[
        {
          label: '主檔管理',
          href: NextPath.SHIPINVENTORYORDER,
        },
        {
          label: '出庫單',
          href: NextPath.SHIPINVENTORYORDER,
        },
        {
          label: id,
        },
      ]}
      title={`出庫單號：${id}`}
      haveBack
      haveFooter
    >
      <SectionWrapper title="單號資訊">section1</SectionWrapper>
    </PageWrapper>
  );
}

export default ViewShipInventoryOrder;
