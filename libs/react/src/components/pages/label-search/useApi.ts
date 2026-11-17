import { useQuery } from '@apollo/client/react';
import {
  useTablePageState,
  useTablePageTotal,
} from '../../../hooks/useTablePagination';
import { useTableSort } from '../../../hooks/useTableSort';
import { AggregatedStocksDocument } from '../../../graphql/generated/.graphql';
import { AGGREGATED_STOCK_SORT_FIELDS } from '../../../utils/columns';

/** ChooseStockTable column key → `AggregatedStockSortField`. */
const CHOOSE_STOCK_SORT_FIELDS = {
  status: AGGREGATED_STOCK_SORT_FIELDS.status,
  quantity: AGGREGATED_STOCK_SORT_FIELDS.quantity,
  baseUnit: AGGREGATED_STOCK_SORT_FIELDS.baseUnit,
} as const;

export function useQueryStocksByMaterialKey(materialKey: string) {
  const { page, setPage, limit, setLimit, offset } = useTablePageState();
  const { sort, getColumnSortProps } = useTableSort({
    fields: CHOOSE_STOCK_SORT_FIELDS,
    setPage,
  });

  const { data, loading } = useQuery(AggregatedStocksDocument, {
    variables: {
      limit,
      offset,
      materialKey,
      sort,
    },
    fetchPolicy: 'cache-and-network',
  });

  const { pageTotal } = useTablePageTotal({
    page,
    total: data?.aggregatedStocks.total,
    setPage,
    filterValues: [materialKey],
  });

  return {
    data,
    loading,
    pageTotal,
    page,
    setPage,
    limit,
    setLimit,
    getColumnSortProps,
  };
}
