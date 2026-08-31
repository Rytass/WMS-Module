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
      materialKey:
        currentFilter?.[FilterType.material]?.name ||
        currentFilter?.['material-search'] ||
        undefined,
      batchKey:
        currentFilter?.[FilterType.batch]?.name ||
        currentFilter?.['batch-search'] ||
        undefined,
      locationKey:
        currentFilter?.[FilterType.location]?.name ||
        currentFilter?.['location-search'] ||
        undefined,
      loaderKey:
        currentFilter?.[FilterType.loader]?.name ||
        currentFilter?.['loader-search'] ||
        undefined,
      description: currentFilter?.[FilterType.materialDescription] || undefined,
      vendorId: currentFilter?.vendorId || undefined,
      customerId: currentFilter?.customerId || undefined,
      saleId: currentFilter?.saleId || undefined,
      saleSerialId: currentFilter?.saleSerialId || undefined,
    },
    fetchPolicy: 'cache-and-network',
  });

  const { pageTotal } = useTablePageTotal({
    page,
    total: data?.stocksGroupedByMaterial.total,
    setPage,
    filterValues: [currentFilter],
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
      materialKey:
        currentFilter?.[FilterType.material]?.name ||
        currentFilter?.['material-search'] ||
        undefined,
      batchKey:
        currentFilter?.[FilterType.batch]?.name ||
        currentFilter?.['batch-search'] ||
        undefined,
      locationKey:
        currentFilter?.[FilterType.location]?.name ||
        currentFilter?.['location-search'] ||
        undefined,
      loaderKey:
        currentFilter?.[FilterType.loader]?.name ||
        currentFilter?.['loader-search'] ||
        undefined,
      description: currentFilter?.[FilterType.materialDescription] || undefined,
      vendorId: currentFilter?.vendorId || undefined,
      customerId: currentFilter?.customerId || undefined,
      saleId: currentFilter?.saleId || undefined,
      saleSerialId: currentFilter?.saleSerialId || undefined,
    },
    fetchPolicy: 'cache-and-network',
  });

  const { pageTotal } = useTablePageTotal({
    page,
    total: data?.aggregatedStocks.total,
    setPage,
    filterValues: [currentFilter],
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
