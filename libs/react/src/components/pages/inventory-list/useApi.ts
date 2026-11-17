import { useQuery } from '@apollo/client/react';
import {
  useTablePageState,
  useTablePageTotal,
} from '../../../hooks/useTablePagination';
import { useTableSort } from '../../../hooks/useTableSort';
import {
  StocksGroupedByMaterialDocument,
  AggregatedStocksDocument,
  StockGroupedByMaterialSortField,
} from '../../../graphql/generated/.graphql';
import { AGGREGATED_STOCK_SORT_FIELDS } from '../../../utils/columns';
import { FilterType } from '../../FilterWrapper/typing';
import { FilterValues } from './typing';

/**
 * GroupTable column key → `StockGroupedByMaterialSortField`. The columns that
 * list several positions' values (batch, location, loader, the commercial
 * attributes, status) have no single value to sort a material by.
 */
const STOCK_GROUPED_SORT_FIELDS = {
  materialKey: StockGroupedByMaterialSortField.MATERIAL_KEY,
  description: StockGroupedByMaterialSortField.MATERIAL_DESCRIPTION,
  quantity: StockGroupedByMaterialSortField.QUANTITY,
  baseUnit: StockGroupedByMaterialSortField.BASE_UNIT,
} as const;

export function useQueryStocksGrouped(currentFilter?: FilterValues) {
  const { page, setPage, limit, setLimit, offset } = useTablePageState();
  const { sort, getColumnSortProps } = useTableSort({
    fields: STOCK_GROUPED_SORT_FIELDS,
    setPage,
  });

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
      sort,
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
    getColumnSortProps,
  };
}

export function useQueryStocks(currentFilter?: FilterValues) {
  const { page, setPage, limit, setLimit, offset } = useTablePageState();
  const { sort, getColumnSortProps } = useTableSort({
    fields: AGGREGATED_STOCK_SORT_FIELDS,
    setPage,
  });

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
      sort,
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
    getColumnSortProps,
  };
}
