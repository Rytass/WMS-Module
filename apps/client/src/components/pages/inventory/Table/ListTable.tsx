import { useMemo } from 'react';
import { TableColumn } from '@mezzanine-ui/react';
import Table from '../../../TableWrapper/Table';
import { StockFragment } from '../../../../graphql/generated/.graphql';
import { useQueryStocks } from '../useApi';

function InventoryListTable() {
  const { data, loading, pageTotal, page, setPage, limit, setLimit } =
    useQueryStocks();

  const dataSource = useMemo(
    (): StockFragment[] => data?.stocks.items ?? [],
    [data?.stocks.items],
  );

  const columns: TableColumn<StockFragment>[] = [
    {
      key: 'description',
      title: '物料說明',
      render: (source) => source.description,
    },
  ];

  return (
    <Table<StockFragment>
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
  );
}

export default InventoryListTable;
