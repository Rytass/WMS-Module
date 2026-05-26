import { useQuery, useMutation } from '@apollo/client/react';
import {
  useTablePageState,
  useTablePageTotal,
} from '../../../hooks/useTablePagination';
import {
  LocationsDocument,
  MapDataDocument,
  UpdateWarehouseMapDocument,
  CreateLocationDocument,
  UpdateLocationDocument,
} from '../../../graphql/generated/.graphql';
import { FilterValues } from './List/typing';

export function useQueryLocations(currentFilter?: FilterValues) {
  const { page, setPage, limit, setLimit, offset } = useTablePageState();

  const { data, loading } = useQuery(LocationsDocument, {
    variables: {
      limit,
      offset,
      description: currentFilter?.description || undefined,
      key:
        currentFilter?.location?.name ||
        currentFilter?.['location-search'] ||
        undefined,
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

export function useUpdateMapData() {
  const [updateMapData, { loading }] = useMutation(UpdateWarehouseMapDocument, {
    refetchQueries: [MapDataDocument],
  });

  return {
    updateMapData,
    loading,
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
