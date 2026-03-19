import { useMemo } from 'react';
import { Message, TableColumn, Button } from '@mezzanine-ui/react';
import Table from '../../../TableWrapper/Table';
import { AggregatedStockFragment } from '../../../../graphql/generated/.graphql';
import { useModal } from '../../../modal/useModal';
import {
  InventoryActionItem,
  stockStatusName,
} from '../../../inventoryActions/utils';
import { useQueryStocksByMaterialKey } from '../useApi';

interface ChooseStockTableProps {
  targetInventoryIds: string[];
  materialKey: string;
  targetAction: InventoryActionItem | null;
  addInventories: ({
    targetStocks,
    currentAction,
    onAddSuccess,
  }: {
    targetStocks: AggregatedStockFragment[];
    currentAction: InventoryActionItem | null;
    onAddSuccess: VoidFunction;
  }) => void;
}

const ChooseStockTable: FC<ChooseStockTableProps> = ({
  targetInventoryIds,
  materialKey,
  targetAction,
  addInventories,
}) => {
  const { closeModal } = useModal();

  const { data, loading, pageTotal, page, setPage, limit, setLimit } =
    useQueryStocksByMaterialKey(materialKey);

  const dataSource = useMemo(
    (): AggregatedStockFragment[] => data?.aggregatedStocks.items ?? [],
    [data?.aggregatedStocks.items],
  );

  const columns: TableColumn<AggregatedStockFragment>[] = [
    {
      key: 'action',
      title: '操作',
      width: 74,
      align: 'center',
      render: (source) => (
        <Button
          type="button"
          size="sub"
          onClick={() => {
            addInventories({
              targetStocks: [source],
              currentAction: targetAction,
              onAddSuccess: () => {
                Message.success(
                  `已加入料號：${source.material.key} / 批號：${source.batch.key} / 儲存位置：${source.location.key}`,
                );
                closeModal();
              },
            });
          }}
        >
          選擇
        </Button>
      ),
    },
    {
      key: 'status',
      title: '狀態',
      width: 122,
      render: (source) => stockStatusName(source.status),
    },
    {
      key: 'quantity',
      title: '數量',
      width: 122,
      align: 'end',
      render: (source) => source.quantity,
    },
    {
      key: 'baseUnit',
      title: '單位',
      width: 100,
      align: 'center',
      render: (source) => source.material?.baseUnit?.key,
    },
  ];

  return (
    <Table<AggregatedStockFragment>
      columns={columns}
      dataSource={dataSource}
      rowState={(source) =>
        targetInventoryIds.includes(source.id) ? 'added' : undefined
      }
      loading={loading}
      pagination={{
        current: page,
        onChange: (page) => setPage(page),
        total: pageTotal,
        pageSize: limit,
        onChangePageSize: (size) => setLimit(size),
      }}
    />
  );
};

export default ChooseStockTable;
