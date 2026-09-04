import { useMemo } from 'react';
import dayjs from 'dayjs';
import {
  Description,
  DescriptionContent,
  TableColumn,
} from '@mezzanine-ui/react';
import Loading from '../../../Loading';
import PageWrapper from '../../../PageWrapper';
import SectionWrapper from '../../../SectionWrapper';
import TableWrapper from '../../../TableWrapper';
import Table from '../../../TableWrapper/Table';
import OrderReferenceList from '../../../orderReference/OrderReferenceList';
import { useOrderReferences } from '../../../orderReference/useOrderReferences';
import { useWmsRouter } from '../../../../router/context';
import { NextPath } from '../../../../utils/nextpath';
import {
  ConsumptionOrderItemFragment,
  WmsOrderType,
} from '../../../../graphql/generated/.graphql';
import { formatKeyName } from '../../../../utils/share';
import { useQueryConsumptionOrder } from '../useApi';
import classes from './index.module.scss';

function ViewConsumptionOrder() {
  const { params } = useWmsRouter();
  const id = useMemo(() => (params?.id as string) ?? '', [params?.id]);

  const { order, loading } = useQueryConsumptionOrder(id);
  const { references } = useOrderReferences(WmsOrderType.CONSUMPTION_ORDER, id);

  const columns: TableColumn<ConsumptionOrderItemFragment>[] = [
    {
      key: 'material',
      title: '料號',
      width: 140,
      render: (source) => source.material?.key,
    },
    {
      key: 'materialDescription',
      title: '物料說明',
      width: 180,
      render: (source) => source.material?.description,
    },
    {
      key: 'batch',
      title: '批號',
      width: 140,
      render: (source) => source.batch?.key,
    },
    {
      key: 'location',
      title: '領用來源',
      width: 140,
      render: (source) => formatKeyName(source.location?.key),
    },
    {
      key: 'targetLocation',
      title: '耗用地點',
      width: 140,
      render: (source) => formatKeyName(source.targetLocation?.key),
    },
    {
      key: 'target',
      title: '預計領用',
      width: 100,
      align: 'end',
      render: (source) => source.targetConsumedQuantity,
    },
    {
      key: 'issued',
      title: '已領用',
      width: 100,
      align: 'end',
      render: (source) => source.issuedQuantity,
    },
    {
      key: 'returned',
      title: '已退回',
      width: 100,
      align: 'end',
      render: (source) => source.returnedQuantity,
    },
    {
      key: 'settled',
      title: '已耗用',
      width: 100,
      align: 'end',
      render: (source) => source.settledQuantity,
    },
    {
      key: 'outstanding',
      title: '在製中',
      width: 100,
      align: 'end',
      render: (source) => source.outstandingQuantity,
    },
    {
      key: 'baseUnit',
      title: '單位',
      width: 80,
      align: 'center',
      render: (source) => source.material?.baseUnit?.key,
    },
  ];

  if (loading && !order) return <Loading />;

  /*
   * `consumptionOrder` is a non-null field, so a bad id or a removed order is a
   * GraphQL error and `order` stays undefined with `loading` false. Rendering
   * the shell anyway produced a page that looked fine and said nothing — an
   * empty title, an empty breadcrumb and four em-dashes.
   */
  if (!order) return null;

  return (
    <PageWrapper
      title={order.key}
      haveBack
      breadcrumb={[
        { label: '領用單', href: NextPath.CONSUMPTIONORDERS },
        { label: order.key },
      ]}
    >
      <SectionWrapper title="單據資訊">
        <div className={classes.fields}>
          <Description widthType="stretch" orientation="vertical" title="單號">
            <DescriptionContent>{order.key}</DescriptionContent>
          </Description>
          <Description widthType="stretch" orientation="vertical" title="說明">
            <DescriptionContent>{order.description || '—'}</DescriptionContent>
          </Description>
          <Description
            widthType="stretch"
            orientation="vertical"
            title="建立者"
          >
            <DescriptionContent>{order.createdBy || '—'}</DescriptionContent>
          </Description>
          <Description
            widthType="stretch"
            orientation="vertical"
            title="建立時間"
          >
            <DescriptionContent>
              {dayjs(order.createdAt).format('YYYY-MM-DD HH:mm')}
            </DescriptionContent>
          </Description>
        </div>
      </SectionWrapper>
      <SectionWrapper title="來源單據">
        {/*
          Plain text unless the host mounted an `OrderReferenceProvider` that
          can resolve a link — the module stores these strings verbatim and has
          no idea what a work order is or where its page lives.
        */}
        <OrderReferenceList references={references} />
      </SectionWrapper>
      <TableWrapper title="領用項目">
        <Table<ConsumptionOrderItemFragment>
          tableKey="ConsumptionOrderItem"
          columns={columns}
          dataSource={order.items ?? []}
          loading={loading}
        />
      </TableWrapper>
    </PageWrapper>
  );
}

export default ViewConsumptionOrder;
