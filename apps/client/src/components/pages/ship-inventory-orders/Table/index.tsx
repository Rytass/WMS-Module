import { useCallback, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { TableColumn } from '@mezzanine-ui/react';
import { useRouter } from 'next/router';
import TableWrapper from '../../../TableWrapper';
import Table from '../../../TableWrapper/Table';
import Actions from './Actions';
import { SimpleShipInventoryOrderFragment } from '../../../../graphql/generated/.graphql';
import {
  useQueryShipInventoryOrders,
  useCreateShipInventoryOrder,
} from '../useApi';
import CreateShipInventoryOrderForm from '../CreateForm';
import Status from '../Status';
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
            references: [],
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
      key: 'actions',
      title: '操作',
      width: 140,
      render: (source) => <Actions source={source} />,
    },
    {
      key: 'status',
      title: '狀態',
      width: 165,
      render: (source) => <Status status={source.status} />,
    },
    {
      key: 'key',
      title: '出庫單號',
      width: 165,
      render: (source) => source.key,
    },
    {
      key: 'createdBy',
      title: '建立者',
      width: 165,
      render: (source) => source.createdBy || '-',
    },
    {
      key: 'createdAt',
      title: '建立日期',
      width: 165,
      render: (source) =>
        source.createdAt ? dayjs(source.createdAt).format('YYYY-MM-DD') : '-',
    },
    {
      key: 'description',
      title: '備註',
      render: (source) => source.description || '-',
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
