import dayjs from 'dayjs';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  useTablePageState,
  useTablePageTotal,
} from '../../../hooks/useTablePagination';
import { useTableSort } from '../../../hooks/useTableSort';
import {
  LoadersDocument,
  LoaderTypesDocument,
  AggregatedStocksDocument,
  CreateBatchLoaderDocument,
  UpdateLoaderDocument,
  CreateLoaderTypeDocument,
  UpdateLoaderTypeDocument,
  LoaderSortField,
  LoaderTypeSortField,
} from '../../../graphql/generated/.graphql';
import { FilterValues as ListFilterValues } from './List/typing';
import { FilterValues as TypesFilterValues } from './Types/typing';
import { FilterType } from '../../FilterWrapper/typing';
import { YesOrNo } from '../../../utils/share';
import { AGGREGATED_STOCK_SORT_FIELDS } from '../../../utils/columns';

/** Table column key → `LoaderSortField`; columns not listed do not sort. */
const LOADER_SORT_FIELDS = {
  isActive: LoaderSortField.IS_ACTIVE,
  typeDescription: LoaderSortField.TYPE_DESCRIPTION,
  serialId: LoaderSortField.SERIAL_ID,
  locationKey: LoaderSortField.LOCATION_KEY,
  length: LoaderSortField.LENGTH,
  width: LoaderSortField.WIDTH,
  height: LoaderSortField.HEIGHT,
  sizeUnit: LoaderSortField.SIZE_UNIT,
  volume: LoaderSortField.VOLUME,
  volumeUnit: LoaderSortField.VOLUME_UNIT,
  createdAt: LoaderSortField.CREATED_AT,
  note: LoaderSortField.NOTE,
} as const;

export function useQueryLoaders(currentFilter?: ListFilterValues) {
  const { page, setPage, limit, setLimit, offset } = useTablePageState();
  const { sort, getColumnSortProps } = useTableSort({
    fields: LOADER_SORT_FIELDS,
    setPage,
  });

  const { data, loading } = useQuery(LoadersDocument, {
    variables: {
      sort,
      limit,
      offset,
      loaderTypeKey:
        currentFilter?.loaderType?.name ||
        currentFilter?.['loaderType-search'] ||
        undefined,
      locationKey:
        currentFilter?.[FilterType.location]?.name ||
        currentFilter?.['location-search'] ||
        undefined,
      key:
        currentFilter?.loader?.name ||
        currentFilter?.['loader-search'] ||
        undefined,
      isActive: currentFilter?.status
        ? currentFilter.status === YesOrNo.YES
        : undefined,
      dateRange: currentFilter?.[FilterType.createdAt]
        ? {
            from: dayjs(currentFilter[FilterType.createdAt])
              .startOf('day')
              .toISOString(),
            to: dayjs(currentFilter[FilterType.createdAt])
              .endOf('day')
              .toISOString(),
          }
        : undefined,
      note: currentFilter?.[FilterType.description] || undefined,
    },
    fetchPolicy: 'cache-and-network',
  });

  const { pageTotal } = useTablePageTotal({
    page,
    total: data?.loaders.total,
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
    getColumnSortProps,
  };
}

/** Table column key → `LoaderTypeSortField`; columns not listed do not sort. */
const LOADER_TYPE_SORT_FIELDS = {
  isActive: LoaderTypeSortField.IS_ACTIVE,
  key: LoaderTypeSortField.KEY,
  description: LoaderTypeSortField.DESCRIPTION,
  createdAt: LoaderTypeSortField.CREATED_AT,
} as const;

export function useQueryLoaderTypes(currentFilter?: TypesFilterValues) {
  const { page, setPage, limit, setLimit, offset } = useTablePageState();
  const { sort, getColumnSortProps } = useTableSort({
    fields: LOADER_TYPE_SORT_FIELDS,
    setPage,
  });

  const { data, loading } = useQuery(LoaderTypesDocument, {
    variables: {
      sort,
      limit,
      offset,
      key:
        currentFilter?.loaderType?.name ||
        currentFilter?.['loaderType-search'] ||
        undefined,
      description: currentFilter?.description || undefined,
      isActive: currentFilter?.status
        ? currentFilter.status === YesOrNo.YES
        : undefined,
      dateRange: currentFilter?.[FilterType.createdAt]
        ? {
            from: dayjs(currentFilter[FilterType.createdAt])
              .startOf('day')
              .toISOString(),
            to: dayjs(currentFilter[FilterType.createdAt])
              .endOf('day')
              .toISOString(),
          }
        : undefined,
    },
    fetchPolicy: 'cache-and-network',
  });

  const { pageTotal } = useTablePageTotal({
    page,
    total: data?.loaderTypes.total,
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
    getColumnSortProps,
  };
}

export function useQueryStocksByLoaderId(loaderId: string) {
  const { page, setPage, limit, setLimit, offset } = useTablePageState();
  const { sort, getColumnSortProps } = useTableSort({
    fields: AGGREGATED_STOCK_SORT_FIELDS,
    setPage,
  });

  const { data, loading } = useQuery(AggregatedStocksDocument, {
    variables: {
      limit,
      offset,
      loaderId,
      sort,
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
    getColumnSortProps,
  };
}

export function useCreateBatchLoader() {
  const [createBatchLoader] = useMutation(CreateBatchLoaderDocument, {
    refetchQueries: [],
  });

  return {
    createBatchLoader,
  };
}

export function useUpdateLoader() {
  const [updateLoader] = useMutation(UpdateLoaderDocument, {
    refetchQueries: [LoadersDocument],
  });

  return {
    updateLoader,
  };
}

export function useCreateLoaderType() {
  const [createLoaderType] = useMutation(CreateLoaderTypeDocument, {
    refetchQueries: [LoaderTypesDocument],
  });

  return {
    createLoaderType,
  };
}

export function useUpdateLoaderType() {
  const [updateLoaderType] = useMutation(UpdateLoaderTypeDocument, {
    refetchQueries: [LoaderTypesDocument],
  });

  return {
    updateLoaderType,
  };
}
