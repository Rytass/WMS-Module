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
  ShipInventoryOrdersDocument,
  SimpleShipInventoryOrderFragment,
} from '../../../../graphql/generated/.graphql';

function ShipInventoryOrdersTable() {
  const { page, setPage, limit, setLimit, offset } = useTablePageState();

  const { data } = useQuery(ShipInventoryOrdersDocument, {
    variables: {
      limit,
      offset,
    },
    fetchPolicy: 'cache-and-network',
  });

  const { pageTotal } = useTablePageTotal({
    page,
    total: data?.shipInventoryOrders.total,
    setPage,
    filterValues: [],
  });

  const dataSource = useMemo(
    (): SimpleShipInventoryOrderFragment[] =>
      data?.shipInventoryOrders.items ?? [],
    [data?.shipInventoryOrders.items],
  );

  const columns: TableColumn<SimpleShipInventoryOrderFragment>[] = [
    {
      key: 'description',
      title: '備註',
      render: (source) => source.description,
    },
  ];

  return (
    <TableWrapper
      title="庫存項目"
      createText="建立出庫單"
      onCreate={() => {
        console.log('建立出庫單');
      }}
    >
      <Table<SimpleShipInventoryOrderFragment>
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

export default ShipInventoryOrdersTable;
