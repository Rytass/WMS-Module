import { useMemo, useState } from 'react';
import { TableColumn } from '@mezzanine-ui/react';
import TableWrapper from '../../../TableWrapper';
import Table from '../../../TableWrapper/Table';
import { SimpleShipInventoryOrderFragment } from '../../../../graphql/generated/.graphql';
import { useQueryShipInventoryOrders } from '../useApi';
import CreateShipInventoryOrderForm from '../CreateForm';

function ShipInventoryOrdersTable() {
  const [createModalOpened, setCreateModalOpened] = useState<boolean>(false);

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
    <>
      <TableWrapper
        title="庫存項目"
        createText="建立出庫單"
        onCreate={() => {
          setCreateModalOpened(true);
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
      <CreateShipInventoryOrderForm
        title="設定基本資料"
        mode="create"
        defaultValues={{
          description: '',
          serial: '',
        }}
        onSubmit={async (values) => {
          console.log('values', values);
        }}
        submitText="下一步"
        closeModal={() => {
          setCreateModalOpened(false);
        }}
        open={createModalOpened}
      />
    </>
  );
}

export default ShipInventoryOrdersTable;
