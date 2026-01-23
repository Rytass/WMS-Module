import { useMemo } from 'react';
import { TableColumn } from '@mezzanine-ui/react';
import { useQuery } from '@apollo/client/react';
import TableWrapper from '../../../TableWrapper';
import Table from '../../../TableWrapper/Table';
import {
  useTablePageState,
  useTablePageTotal,
} from '../../../../hooks/useTablePagination';
import {
  ReceiveInventoryOrdersDocument,
  ReceiveInventoryOrderFragment,
} from '../../../../graphql/generated/.graphql';
// import { FilterValues } from '../typing';

function ReceiveInventoryOrdersTable() {
  const { page, setPage, limit, setLimit, offset } = useTablePageState();

  const { data } = useQuery(ReceiveInventoryOrdersDocument, {
    variables: {
      limit,
      offset,
    },
    fetchPolicy: 'cache-and-network',
  });

  const { pageTotal } = useTablePageTotal({
    page,
    total: data?.receiveInventoryOrders.total,
    setPage,
    filterValues: [],
  });

  const dataSource = useMemo(
    (): ReceiveInventoryOrderFragment[] =>
      data?.receiveInventoryOrders.items ?? [],
    [data?.receiveInventoryOrders.items],
  );

  const columns: TableColumn<ReceiveInventoryOrderFragment>[] = [
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
      <Table<ReceiveInventoryOrderFragment>
        columns={columns}
        dataSource={dataSource}
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
