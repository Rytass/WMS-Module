import { useMemo } from 'react';
import { TableColumn } from '@mezzanine-ui/react';
import TableWrapper from '../../../TableWrapper';
import Table from '../../../TableWrapper/Table';
import { SimpleShipInventoryOrderFragment } from '../../../../graphql/generated/.graphql';
import { useQueryShipInventoryOrders } from '../useApi';

function ShipInventoryOrdersTable() {
  const { data, loading, pageTotal, page, setPage, limit, setLimit } =
    useQueryShipInventoryOrders();

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

export default ShipInventoryOrdersTable;
