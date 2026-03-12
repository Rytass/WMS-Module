import { useQuery, useMutation } from '@apollo/client/react';
import {
  useTablePageState,
  useTablePageTotal,
} from '../../../hooks/useTablePagination';
import {
  LoadersDocument,
  LoaderTypesDocument,
  AggregatedStocksDocument,
  CreateLoaderTypeDocument,
  UpdateLoaderTypeDocument,
} from '../../../graphql/generated/.graphql';

export function useQueryLoaders() {
  const { page, setPage, limit, setLimit, offset } = useTablePageState();

  const { data, loading } = useQuery(LoadersDocument, {
    variables: {
      limit,
      offset,
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

export function useQueryLoaderTypes() {
  const { page, setPage, limit, setLimit, offset } = useTablePageState();

  const { data, loading } = useQuery(LoaderTypesDocument, {
    variables: {
      limit,
      offset,
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
