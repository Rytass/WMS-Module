import { useCallback, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { TableColumn, Badge, Message } from '@mezzanine-ui/react';
import TableWrapper from '../../../../TableWrapper';
import Table from '../../../../TableWrapper/Table';
import { ReceiveInventoryOrderFragment } from '../../../../../graphql/generated/.graphql';
import { useQueryReceiveInventoryOrders } from '../../useApi';

function InventoryMovementReceiveTable() {
  const { data, loading, pageTotal, page, setPage, limit, setLimit } =
    useQueryReceiveInventoryOrders();

  const dataSource = useMemo(
    (): ReceiveInventoryOrderFragment[] =>
      data?.receiveInventoryOrders.items ?? [],
    [data?.receiveInventoryOrders.items],
  );

  const columns: TableColumn<ReceiveInventoryOrderFragment>[] = [
    {
      key: 'key',
      title: '入庫單號',
      width: 140,
      render: (source) => source.key,
    },
  ];

  return (
    <>
      <TableWrapper title="入庫單清單">
        <Table<ReceiveInventoryOrderFragment>
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
    </>
  );
}

export default InventoryMovementReceiveTable;
