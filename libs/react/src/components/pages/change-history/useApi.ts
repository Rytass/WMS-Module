import { useQuery } from '@apollo/client/react';
import {
  useTablePageState,
  useTablePageTotal,
} from '../../../hooks/useTablePagination';
import { useTableSort } from '../../../hooks/useTableSort';
import {
  ChangeLogsDocument,
  ChangeLogSortField,
} from '../../../graphql/generated/.graphql';
import { FilterType } from '../../FilterWrapper/typing';
import { FilterValues } from './typing';

/** Table column key → `ChangeLogSortField`; columns not listed do not sort. */
const CHANGE_LOG_SORT_FIELDS = {
  changeType: ChangeLogSortField.CHANGE_TYPE,
  key: ChangeLogSortField.MATERIAL_KEY,
  description: ChangeLogSortField.MATERIAL_DESCRIPTION,
  batchKey: ChangeLogSortField.BATCH_KEY,
  locationKey: ChangeLogSortField.LOCATION_KEY,
  quantity: ChangeLogSortField.QUANTITY,
  baseUnit: ChangeLogSortField.BASE_UNIT,
} as const;

export function useQueryChangeLogs(currentFilter?: FilterValues) {
  const { page, setPage, limit, setLimit, offset } = useTablePageState();
  const { sort, getColumnSortProps } = useTableSort({
    fields: CHANGE_LOG_SORT_FIELDS,
    setPage,
  });

  const { data, loading } = useQuery(ChangeLogsDocument, {
    variables: {
      sort,
      offset,
      limit,
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
    },
    fetchPolicy: 'cache-and-network',
  });

  const { pageTotal } = useTablePageTotal({
    page,
    total: data?.changeLogs.total,
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
