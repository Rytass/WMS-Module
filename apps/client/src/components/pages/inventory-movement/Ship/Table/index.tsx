import { useMemo } from 'react';
import { uniq } from 'lodash';
import dayjs from 'dayjs';
import { TableColumn } from '@mezzanine-ui/react';
import TableWrapper from '../../../../TableWrapper';
import Table from '../../../../TableWrapper/Table';
import Actions from './Actions';
import { ShipInventoryOrderFragment } from '../../../../../graphql/generated/.graphql';
import { useQueryShipInventoryOrders } from '../../useApi';

function InventoryMovementShipTable() {
  const { data, loading, pageTotal, page, setPage, limit, setLimit } =
    useQueryShipInventoryOrders();

  const dataSource = useMemo(
    (): ShipInventoryOrderFragment[] => data?.shipInventoryOrders.items ?? [],
    [data?.shipInventoryOrders.items],
  );

  const columns: TableColumn<ShipInventoryOrderFragment>[] = [
    {
      key: 'actions',
      title: '操作',
      width: 152,
      render: (source) => <Actions source={source} />,
    },
    {
      key: 'key',
      title: '出庫單號',
      width: 140,
      render: (source) => source.key,
    },
    {
      key: 'material',
      title: '料號',
      width: 140,
      render: (source) =>
        uniq((source.items ?? []).map((item) => item.material.key)).join(','),
    },
    {
      key: 'materialDescription',
      title: '物料說明',
      width: 140,
      render: (source) =>
        uniq(
          (source.items ?? []).map((item) => item.material.description),
        ).join(','),
    },
    {
      key: 'batch',
      title: '批號',
      width: 140,
      render: (source) =>
        uniq((source.items ?? []).map((item) => item.batch?.key || '')).join(
          ',',
        ),
    },
    {
      key: 'location',
      title: '來源位置',
      width: 140,
      render: (source) =>
        uniq((source.items ?? []).map((item) => item.location?.key || '')).join(
          ',',
        ),
    },
    {
      key: 'loader',
      title: '來源載具',
      width: 140,
      render: (source) =>
        uniq(
          (source.items ?? []).map((item) => item.loader?.serialId || ''),
        ).join(','),
    },
    {
      key: 'createdBy',
      title: '建立者',
      width: 140,
      render: (source) => source.createdBy,
    },
    {
      key: 'createdAt',
      title: '建立時間',
      width: 140,
      render: (source) =>
        source.createdAt ? dayjs(source.createdAt).format('YYYY-MM-DD') : '-',
    },
    {
      key: 'description',
      title: '備註',
      width: 140,
      render: (source) => source.description || '-',
    },
  ];

  return (
    <TableWrapper title="出庫單清單">
      <Table<ShipInventoryOrderFragment>
        columns={columns}
        dataSource={dataSource}
        loading={loading}
        pagination={{
          current: page,
          onChange: (page) => setPage(page),
          total: pageTotal,
          pageSize: limit,
          onChangePageSize: (size) => setLimit(size),
        }}
      />
    </TableWrapper>
  );
}

export default InventoryMovementShipTable;
