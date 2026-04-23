import { useQuery, useMutation } from '@apollo/client/react';
import {
  useTablePageState,
  useTablePageTotal,
} from '../../../hooks/useTablePagination';
import {
  LocationsDocument,
  CreateLocationDocument,
  UpdateLocationDocument,
} from '../../../graphql/generated/.graphql';

export function useQueryLocations() {
  const { page, setPage, limit, setLimit, offset } = useTablePageState();

  const { data, loading } = useQuery(LocationsDocument, {
    variables: {
      limit,
      offset,
    },
    fetchPolicy: 'cache-and-network',
  });

  const { pageTotal } = useTablePageTotal({
    page,
    total: data?.locations.total,
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

export function useCreateLocation() {
  const [createLocation, { loading }] = useMutation(CreateLocationDocument, {
    refetchQueries: [LocationsDocument],
  });

  return {
    createLocation,
    loading,
  };
}

export function useUpdateLocation() {
  const [updateLocation, { loading }] = useMutation(UpdateLocationDocument, {
    refetchQueries: [LocationsDocument],
  });

  return {
    updateLocation,
    loading,
  };
}
