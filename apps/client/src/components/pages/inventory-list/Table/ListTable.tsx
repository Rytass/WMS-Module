import { Dispatch, SetStateAction, useState, useMemo, useEffect } from 'react';
import { TableColumn } from '@mezzanine-ui/react';
import Table from '../../../TableWrapper/Table';
import { AggregatedStockFragment } from '../../../../graphql/generated/.graphql';
import { useInventoryActions } from '../../../inventoryActions/useInventoryActions';
import { aggregatedStockColumns } from '../../../../utils/share';
import { stockStatusName } from '../../../inventoryActions/utils';
import { useQueryStocks } from '../useApi';
import { FilterValues } from '../typing';

interface InventoryListTableProps {
  currentFilter?: FilterValues;
  setTargetStocks: Dispatch<SetStateAction<AggregatedStockFragment[]>>;
  needClearSelectedRows: boolean;
  setNeedClearSelectedRows: Dispatch<SetStateAction<boolean>>;
}

function InventoryListTable({
  currentFilter,
  needClearSelectedRows,
  setNeedClearSelectedRows,
  setTargetStocks,
}: InventoryListTableProps) {
  const { targetInventoryIds } = useInventoryActions();

  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [dataSignature, setDataSignature] = useState<{
    [id: string]: AggregatedStockFragment;
  }>({});

  useEffect(() => {
    if (needClearSelectedRows) {
      setSelectedRowKeys([]);
      setNeedClearSelectedRows(false);
    }
  }, [needClearSelectedRows, setNeedClearSelectedRows]);

  useEffect(() => {
    setTargetStocks(selectedRowKeys.map((key) => dataSignature[key]));
  }, [dataSignature, selectedRowKeys, setTargetStocks]);

  const { data, loading, pageTotal, page, setPage, limit, setLimit } =
    useQueryStocks(currentFilter);

  const dataSource = useMemo(
    (): AggregatedStockFragment[] => data?.aggregatedStocks.items ?? [],
    [data?.aggregatedStocks.items],
  );

  useEffect(() => {
    const signature = dataSource.reduce(
      (prev, curr) => ({
        ...prev,
        [curr.id]: curr,
      }),
      {},
    );

    setDataSignature((s) => ({ ...s, ...signature }));
  }, [dataSource]);

  const columns: TableColumn<AggregatedStockFragment>[] = [
    {
      key: 'status',
      title: '狀態',
      width: 100,
      render: (source) => stockStatusName(source.status),
    },
    ...aggregatedStockColumns,
  ];

  return (
    <Table<AggregatedStockFragment>
      columns={columns}
      dataSource={dataSource}
      rowState={(source) =>
        targetInventoryIds.includes(source.id) ? 'added' : undefined
      }
      loading={loading}
      rowSelection={{
        mode: 'checkbox',
        onChange: setSelectedRowKeys,
        selectedRowKeys,
        preserveSelectedRowKeys: true,
        fixed: true,
      }}
      pagination={{
        current: page,
        onChange: (page) => setPage(page),
        total: pageTotal,
        pageSize: limit,
        onChangePageSize: (size) => setLimit(size),
      }}
    />
  );
}

export default InventoryListTable;
