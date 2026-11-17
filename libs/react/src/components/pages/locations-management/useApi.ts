import { useQuery, useMutation } from '@apollo/client/react';
import {
  useTablePageState,
  useTablePageTotal,
} from '../../../hooks/useTablePagination';
import { useTableSort } from '../../../hooks/useTableSort';
import {
  LocationsDocument,
  MapDataDocument,
  UpdateWarehouseMapDocument,
  CreateLocationDocument,
  UpdateLocationDocument,
  LocationSortField,
} from '../../../graphql/generated/.graphql';
import { FilterValues } from './List/typing';

/** Table column key → `LocationSortField`; columns not listed do not sort. */
const LOCATION_SORT_FIELDS = {
  isActive: LocationSortField.IS_ACTIVE,
  key: LocationSortField.KEY,
  description: LocationSortField.DESCRIPTION,
} as const;

export function useQueryLocations(currentFilter?: FilterValues) {
  const { page, setPage, limit, setLimit, offset } = useTablePageState();
  const { sort, getColumnSortProps } = useTableSort({
    fields: LOCATION_SORT_FIELDS,
    setPage,
  });

  const { data, loading } = useQuery(LocationsDocument, {
    variables: {
      sort,
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
    getColumnSortProps,
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
