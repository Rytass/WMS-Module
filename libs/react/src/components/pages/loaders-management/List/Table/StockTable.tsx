import { useMemo } from 'react';
import { TableColumn } from '@mezzanine-ui/react';
import Table from '../../../../TableWrapper/Table';
import { AggregatedStockFragment } from '../../../../../graphql/generated/.graphql';
import { getAggregatedStockColumns } from '../../../../../utils/columns';
import { useQueryStocksByLoaderId } from '../../useApi';

interface StockTableProps {
  loaderId: string;
}

const StockTable: FC<StockTableProps> = ({ loaderId }) => {
  const {
    data,
    loading,
    pageTotal,
    page,
    setPage,
    limit,
    setLimit,
    getColumnSortProps,
  } = useQueryStocksByLoaderId(loaderId);

  const dataSource = useMemo(
    (): AggregatedStockFragment[] => data?.aggregatedStocks.items ?? [],
    [data?.aggregatedStocks.items],
  );

  const columns: TableColumn<AggregatedStockFragment>[] =
    getAggregatedStockColumns(getColumnSortProps);

  return (
    <Table<AggregatedStockFragment>
      tableKey="LoaderStocks"
      pinnedUntilColumnKey="materialKey"
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
