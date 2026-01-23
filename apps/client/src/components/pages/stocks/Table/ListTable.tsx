import { useMemo } from 'react';
import { TableColumn } from '@mezzanine-ui/react';
import { useQuery } from '@apollo/client/react';
import Table from '../../../TableWrapper/Table';
import {
  useTablePageState,
  useTablePageTotal,
} from '../../../../hooks/useTablePagination';
import {
  StocksDocument,
  StockFragment,
} from '../../../../graphql/generated/.graphql';

function StocksListTable() {
  const { page, setPage, limit, setLimit, offset } = useTablePageState();

  const { data } = useQuery(StocksDocument, {
    variables: {
      limit,
      offset,
    },
    fetchPolicy: 'cache-and-network',
  });

  const { pageTotal } = useTablePageTotal({
    page,
    total: data?.stocks.total,
    setPage,
    filterValues: [],
  });

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

export default StocksListTable;
