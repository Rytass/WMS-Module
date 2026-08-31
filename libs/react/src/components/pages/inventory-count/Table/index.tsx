import { useCallback, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Button, Message, TableColumn } from '@mezzanine-ui/react';
import { useWmsRouter } from '../../../../router/context';
import TableWrapper from '../../../TableWrapper';
import Table from '../../../TableWrapper/Table';
import CreateInventoryCountForm from '../CreateForm';
import Status from '../Status';
import { FormValues } from '../CreateForm/typing';
import { FilterValues } from '../typing';
import {
  useInventoryCountMutations,
  useQueryInventoryCountOrders,
} from '../useApi';
import { InventoryCountOrderListItemFragment } from '../../../../graphql/generated/.graphql';
import { NextPath } from '../../../../utils/nextpath';
import { nextDynamicPath } from '../../../../utils/path';

interface InventoryCountTableProps {
  currentFilter?: FilterValues;
}

const InventoryCountTable: FC<InventoryCountTableProps> = ({
  currentFilter,
}) => {
  const [createModalOpened, setCreateModalOpened] = useState<boolean>(false);
  const { push } = useWmsRouter();

  const { data, loading, pageTotal, page, setPage, limit, setLimit } =
    useQueryInventoryCountOrders(currentFilter);

  const { createInventoryCountOrder } = useInventoryCountMutations();

  const onCreate = useCallback(
    async (values: FormValues) => {
      const { data: created } = await createInventoryCountOrder({
        variables: {
          name: values.name,
          countDate: dayjs(values.countDate).format('YYYY-MM-DD'),
          locationIds: values.locations.map(({ id }) => id),
        },
      });

      if (created?.createInventoryCountOrder.id) {
        Message.success('建立盤點成功');
        setCreateModalOpened(false);
        push(
          nextDynamicPath(NextPath.INVENTORYCOUNT_ID, {
            '[id]': created.createInventoryCountOrder.id,
          }),
        );
      }
    },
    [createInventoryCountOrder, push],
  );

  const dataSource = useMemo(
    (): InventoryCountOrderListItemFragment[] =>
      data?.inventoryCountOrders.items ?? [],
    [data?.inventoryCountOrders.items],
  );

  const columns: TableColumn<InventoryCountOrderListItemFragment>[] = [
    {
      key: 'actions',
      title: '操作',
      width: 100,
      render: (source) => (
        <Button
          type="button"
          size="sub"
          variant="base-primary"
          onClick={() =>
            push(
              nextDynamicPath(NextPath.INVENTORYCOUNT_ID, {
                '[id]': source.id,
              }),
            )
          }
        >
          檢視
        </Button>
      ),
    },
    {
      key: 'name',
      title: '名稱',
      width: 220,
      render: (source) => source.name || '-',
    },
    {
      key: 'locations',
      title: '盤點範圍',
      width: 200,
      // Only the roots are shown; the expansion below them would be noise.
      // Mezzanine's Table calls `render` for its empty-state row too, so every
      // accessor here has to tolerate a source without the field.
      render: (source) =>
        (source.locations ?? []).map(({ key }) => key).join('、') || '-',
    },
    {
      key: 'countDate',
      title: '盤點日期',
      width: 165,
      render: (source) =>
        source.countDate ? dayjs(source.countDate).format('YYYY-MM-DD') : '-',
    },
    {
      key: 'createdBy',
      title: '建立者',
      width: 165,
      render: (source) => source.createdBy || '-',
    },
    {
      key: 'status',
      title: '狀態',
      width: 140,
      render: (source) =>
        source.status ? <Status status={source.status} /> : null,
    },
  ];

  return (
    <>
      <TableWrapper
        title="盤點項目"
        createText="建立盤點"
        onCreate={() => {
          setCreateModalOpened(true);
        }}
      >
        <Table<InventoryCountOrderListItemFragment>
          tableKey="InventoryCount"
          columns={columns}
          dataSource={dataSource}
          loading={loading}
          pagination={{
            current: page,
            onChange: (nextPage) => setPage(nextPage),
            total: pageTotal,
            pageSize: limit,
            onChangePageSize: (size) => setLimit(size),
          }}
        />
      </TableWrapper>
      <CreateInventoryCountForm
        onSubmit={onCreate}
        closeModal={() => {
          setCreateModalOpened(false);
        }}
        open={createModalOpened}
      />
    </>
  );
};

export default InventoryCountTable;
