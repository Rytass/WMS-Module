import { Dispatch, SetStateAction, useState, useMemo, useEffect } from 'react';
import { TableColumn } from '@mezzanine-ui/react';
import Table from '../../../TableWrapper/Table';
import { AggregatedStockFragment } from '../../../../graphql/generated/.graphql';
import { useQueryStocks } from '../useApi';

interface InventoryListTableProps {
  setTargetStocks: Dispatch<SetStateAction<AggregatedStockFragment[]>>;
}

function InventoryListTable({ setTargetStocks }: InventoryListTableProps) {
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [dataSignature, setDataSignature] = useState<{
    [id: string]: AggregatedStockFragment;
  }>({});

  useEffect(() => {
    setTargetStocks(selectedRowKeys.map((key) => dataSignature[key]));
  }, [dataSignature, selectedRowKeys, setTargetStocks]);

  const { data, loading, pageTotal, page, setPage, limit, setLimit } =
    useQueryStocks();

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
      key: 'materialKey',
      title: '料號',
      width: 140,
      render: (source) => source.material?.key,
    },
    {
      key: 'description',
      title: '物料說明',
      width: 140,
      render: (source) => source.material?.description,
    },
    {
      key: 'batchKey',
      title: '批號',
      width: 140,
      render: (source) => source.batch?.key,
    },
    {
      key: 'quantity',
      title: '數量',
      width: 100,
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
