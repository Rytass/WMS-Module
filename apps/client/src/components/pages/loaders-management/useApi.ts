import dayjs from 'dayjs';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  useTablePageState,
  useTablePageTotal,
} from '../../../hooks/useTablePagination';
import {
  LoadersDocument,
  LoaderTypesDocument,
  AggregatedStocksDocument,
  CreateBatchLoaderDocument,
  UpdateLoaderDocument,
  CreateLoaderTypeDocument,
  UpdateLoaderTypeDocument,
} from '../../../graphql/generated/.graphql';
import { FilterValues as ListFilterValues } from './List/typing';
import { FilterValues as TypesFilterValues } from './Types/typing';
import { FilterType } from '../../FilterWrapper/typing';
import { YesOrNo } from '../../../utils/share';

export function useQueryLoaders(currentFilter?: ListFilterValues) {
  const { page, setPage, limit, setLimit, offset } = useTablePageState();

  const { data, loading } = useQuery(LoadersDocument, {
    variables: {
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
  };
}

export function useQueryLoaderTypes(currentFilter?: TypesFilterValues) {
  const { page, setPage, limit, setLimit, offset } = useTablePageState();

  const { data, loading } = useQuery(LoaderTypesDocument, {
    variables: {
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
  };
}

export function useQueryStocksByLoaderId(loaderId: string) {
  const { page, setPage, limit, setLimit, offset } = useTablePageState();

  const { data, loading } = useQuery(AggregatedStocksDocument, {
    variables: {
      limit,
      offset,
      loaderId,
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
