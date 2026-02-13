import { useQuery } from '@apollo/client/react';
import {
  useTablePageState,
  useTablePageTotal,
} from '../../../hooks/useTablePagination';
import {
  StocksGroupedByMaterialDocument,
  AggregatedStocksDocument,
} from '../../../graphql/generated/.graphql';
import { FilterType } from '../../FilterWrapper/typing';
import { FilterValues } from './typing';

export function useQueryStocksGrouped(currentFilter?: FilterValues) {
  const { page, setPage, limit, setLimit, offset } = useTablePageState();

  const { data, loading } = useQuery(StocksGroupedByMaterialDocument, {
    variables: {
      limit,
      offset,
      materialId: currentFilter?.[FilterType.material],
      description: currentFilter?.[FilterType.materialDescription],
    },
    fetchPolicy: 'cache-and-network',
  });

  const { pageTotal } = useTablePageTotal({
    page,
    total: data?.stocksGroupedByMaterial.total,
    setPage,
    filterValues: [],
  });

  return {
    data,
    loading,
    pageTotal,
    page,
    setPage,
    limit,
    setLimit,
  };
}

export function useQueryStocks(currentFilter?: FilterValues) {
  const { page, setPage, limit, setLimit, offset } = useTablePageState();

  const { data, loading } = useQuery(AggregatedStocksDocument, {
    variables: {
      limit,
      offset,
      materialId: currentFilter?.[FilterType.material],
      description: currentFilter?.[FilterType.materialDescription],
    },
    fetchPolicy: 'cache-and-network',
  });

  const { pageTotal } = useTablePageTotal({
    page,
    total: data?.aggregatedStocks.total,
    setPage,
    filterValues: [],
  });

  return {
    data,
    loading,
    pageTotal,
    page,
    setPage,
    limit,
    setLimit,
  };
}
