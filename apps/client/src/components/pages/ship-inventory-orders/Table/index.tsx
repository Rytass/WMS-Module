import { useCallback, useMemo, useState } from 'react';
import { TableColumn } from '@mezzanine-ui/react';
import { useRouter } from 'next/router';
import TableWrapper from '../../../TableWrapper';
import Table from '../../../TableWrapper/Table';
import { SimpleShipInventoryOrderFragment } from '../../../../graphql/generated/.graphql';
import {
  useQueryShipInventoryOrders,
  useCreateShipInventoryOrder,
} from '../useApi';
import CreateShipInventoryOrderForm from '../CreateForm';
import { FormValues } from '../CreateForm/typing';
import { NextPath } from '../../../../utils/nextpath';
import { nextDynamicPath } from '../../../../utils/path';

function ShipInventoryOrdersTable() {
  const [createModalOpened, setCreateModalOpened] = useState<boolean>(false);
  const { push } = useRouter();

  const { data, loading, pageTotal, page, setPage, limit, setLimit } =
    useQueryShipInventoryOrders();

  const { createShipInventoryOrder } = useCreateShipInventoryOrder();

  const onSubmit = useCallback(
    async (values: FormValues) => {
      try {
        const { data } = await createShipInventoryOrder({
          variables: {
            key: values.serial,
            description: values.description ?? '',
            items: [],
          },
        });

        if (data?.createShipInventoryOrder.id) {
          push(
            nextDynamicPath(NextPath.SHIPINVENTORYORDERS_ID_EDIT, {
              '[id]': data.createShipInventoryOrder.id,
            }),
          );
        }
      } catch (error) {
        console.error(error);
      }
    },
    [createShipInventoryOrder, push],
  );

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
        onSubmit={onSubmit}
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
