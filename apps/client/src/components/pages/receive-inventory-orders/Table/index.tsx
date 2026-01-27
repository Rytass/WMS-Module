import { useMemo } from 'react';
import { TableColumn } from '@mezzanine-ui/react';
import TableWrapper from '../../../TableWrapper';
import Table from '../../../TableWrapper/Table';
import { SimpleReceiveInventoryOrderFragment } from '../../../../graphql/generated/.graphql';
import { useQueryReceiveInventoryOrders } from '../useApi';

function ReceiveInventoryOrdersTable() {
  const { data, loading, pageTotal, page, setPage, limit, setLimit } =
    useQueryReceiveInventoryOrders();

  const dataSource = useMemo(
    (): SimpleReceiveInventoryOrderFragment[] =>
      data?.receiveInventoryOrders.items ?? [],
    [data?.receiveInventoryOrders.items],
  );

  const columns: TableColumn<SimpleReceiveInventoryOrderFragment>[] = [
    {
      key: 'createdBy',
      title: '建立者',
      width: 165,
      render: (source) => source.createdBy,
    },
    {
      key: 'description',
      title: '備註',
      render: (source) => source.description,
    },
  ];

  return (
    <TableWrapper
      title="庫存項目"
      createText="建立入庫單"
      onCreate={() => {
        console.log('建立入庫單');
      }}
    >
      <Table<SimpleReceiveInventoryOrderFragment>
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

export default ReceiveInventoryOrdersTable;
