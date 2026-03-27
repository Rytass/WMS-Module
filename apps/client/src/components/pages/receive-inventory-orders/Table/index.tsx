import { useMemo, useState, useCallback } from 'react';
import dayjs from 'dayjs';
import { TableColumn } from '@mezzanine-ui/react';
import { useRouter } from 'next/router';
import TableWrapper from '../../../TableWrapper';
import Table from '../../../TableWrapper/Table';
import Actions from './Actions';
import { SimpleReceiveInventoryOrderFragment } from '../../../../graphql/generated/.graphql';
import {
  useQueryReceiveInventoryOrders,
  useCreateReceiveInventoryOrder,
} from '../useApi';
import CreateReceiveInventoryOrderForm from '../CreateForm';
import Status from '../Status';
import { FormValues } from '../CreateForm/typing';
import { NextPath } from '../../../../utils/nextpath';
import { nextDynamicPath } from '../../../../utils/path';

function ReceiveInventoryOrdersTable() {
  const [createModalOpened, setCreateModalOpened] = useState<boolean>(false);
  const { push } = useRouter();

  const { data, loading, pageTotal, page, setPage, limit, setLimit } =
    useQueryReceiveInventoryOrders();

  const { createReceiveInventoryOrder } = useCreateReceiveInventoryOrder();

  const onSubmit = useCallback(
    async (values: FormValues) => {
      try {
        const { data } = await createReceiveInventoryOrder({
          variables: {
            key: values.serial,
            description: values.description ?? '',
            items: [],
          },
        });

        if (data?.createReceiveInventoryOrder.id) {
          push(
            nextDynamicPath(NextPath.RECEIVEINVENTORYORDERS_ID_EDIT, {
              '[id]': data.createReceiveInventoryOrder.id,
            }),
          );
        }
      } catch (error) {
        console.error(error);
      }
    },
    [createReceiveInventoryOrder, push],
  );

  const dataSource = useMemo(
    (): SimpleReceiveInventoryOrderFragment[] =>
      data?.receiveInventoryOrders.items ?? [],
    [data?.receiveInventoryOrders.items],
  );

  const columns: TableColumn<SimpleReceiveInventoryOrderFragment>[] = [
    {
      key: 'actions',
      title: '操作',
      width: 152,
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
      title: '入庫單號',
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
        createText="建立入庫單"
        onCreate={() => {
          setCreateModalOpened(true);
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
      <CreateReceiveInventoryOrderForm
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

export default ReceiveInventoryOrdersTable;
