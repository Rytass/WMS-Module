import { useMemo } from 'react';
import { TableColumn } from '@mezzanine-ui/react';
import Table from '../../../../TableWrapper/Table';
import { AggregatedStockFragment } from '../../../../../graphql/generated/.graphql';
import { aggregatedStockColumns } from '../../../../../utils/share';
import { useQueryStocksByLoaderId } from '../../useApi';

interface StockTableProps {
  loaderId: string;
}

const StockTable: FC<StockTableProps> = ({ loaderId }) => {
  const { data, loading, pageTotal, page, setPage, limit, setLimit } =
    useQueryStocksByLoaderId(loaderId);

  const dataSource = useMemo(
    (): AggregatedStockFragment[] => data?.aggregatedStocks.items ?? [],
    [data?.aggregatedStocks.items],
  );

  const columns: TableColumn<AggregatedStockFragment>[] =
    aggregatedStockColumns;

  return (
    <Table<AggregatedStockFragment>
      tableKey="LoaderStocks"
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
};

export default StockTable;
