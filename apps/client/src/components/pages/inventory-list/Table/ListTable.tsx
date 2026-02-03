import { Dispatch, SetStateAction, useState, useMemo, useEffect } from 'react';
import { TableColumn } from '@mezzanine-ui/react';
import Table from '../../../TableWrapper/Table';
import { StockFragment } from '../../../../graphql/generated/.graphql';
import { useQueryStocks } from '../useApi';

interface InventoryListTableProps {
  setTargetStocks: Dispatch<SetStateAction<StockFragment[]>>;
}

function InventoryListTable({ setTargetStocks }: InventoryListTableProps) {
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [dataSignature, setDataSignature] = useState<{
    [id: string]: StockFragment;
  }>({});

  useEffect(() => {
    setTargetStocks(selectedRowKeys.map((key) => dataSignature[key]));
  }, [dataSignature, selectedRowKeys, setTargetStocks]);

  const { data, loading, pageTotal, page, setPage, limit, setLimit } =
    useQueryStocks();

  const dataSource = useMemo(
    (): StockFragment[] => data?.stocks.items ?? [],
    [data?.stocks.items],
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

  const columns: TableColumn<StockFragment>[] = [
    {
      key: 'description',
      title: '物料說明',
      render: (source) => source.material?.description,
    },
  ];

  return (
    <Table<StockFragment>
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
