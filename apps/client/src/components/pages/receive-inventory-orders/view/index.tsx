import { useMemo } from 'react';
import { useRouter } from 'next/router';
import {
  Description,
  DescriptionContent,
  SelectValue,
} from '@mezzanine-ui/react';
import { NextPath } from '../../../../utils/nextpath';
import PageWrapper from '../../../PageWrapper';
import SectionWrapper from '../../../SectionWrapper';
import Status from '../Status';
import { useQueryReceiveInventoryOrder } from '../useApi';
import Loading from '../../../Loading';
import classes from './index.module.scss';

function ViewReceiveInventoryOrder() {
  const { query } = useRouter();
  const id = useMemo(() => (query?.id as string) ?? '', [query.id]);

  const { data, loading } = useQueryReceiveInventoryOrder(id);

  const receiveInventoryOrder = useMemo(
    () => data?.receiveInventoryOrder ?? null,
    [data?.receiveInventoryOrder],
  );

  if (loading) {
    return <Loading />;
  }

  if (!receiveInventoryOrder) {
    return null;
  }

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
          label: receiveInventoryOrder.key,
        },
      ]}
      title={`入庫單號：${receiveInventoryOrder.key}`}
      haveBack
      haveFooter
    >
      <SectionWrapper title="單號資訊">
        <div className={classes.headSectionWrapper}>
          <Description
            widthType="stretch"
            orientation="vertical"
            title="建立者"
          >
            <DescriptionContent>
              {receiveInventoryOrder.createdBy || '-'}
            </DescriptionContent>
          </Description>
          <Description
            widthType="stretch"
            orientation="vertical"
            title="建立日期"
          >
            <DescriptionContent>今天</DescriptionContent>
          </Description>
          <Description widthType="stretch" orientation="vertical" title="狀態">
            <Status status={receiveInventoryOrder.status} />
          </Description>
          <Description widthType="stretch" orientation="vertical" title="備註">
            <DescriptionContent>
              {receiveInventoryOrder.description}
            </DescriptionContent>
          </Description>
        </div>
      </SectionWrapper>
    </PageWrapper>
  );
}

export default ViewReceiveInventoryOrder;
