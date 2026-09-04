import { useQuery } from '@apollo/client/react';
import {
  useTablePageState,
  useTablePageTotal,
} from '../../../hooks/useTablePagination';
import {
  ConsumptionOrderDocument,
  ConsumptionOrdersDocument,
} from '../../../graphql/generated/.graphql';
import { FilterType } from '../../FilterWrapper/typing';
import { FilterValues } from './typing';

export function useQueryConsumptionOrders(currentFilter?: FilterValues) {
  const { page, setPage, limit, setLimit, offset } = useTablePageState();

  const { data, loading } = useQuery(ConsumptionOrdersDocument, {
    variables: {
      offset,
      limit,
      materialId: currentFilter?.[FilterType.material]?.id || undefined,
      batchId: currentFilter?.[FilterType.batch]?.id || undefined,
      locationId: currentFilter?.[FilterType.location]?.id || undefined,
    },
    fetchPolicy: 'cache-and-network',
  });

  const { pageTotal } = useTablePageTotal({
    page,
    total: data?.consumptionOrders.total,
    setPage,
    // The filter values, not an empty array: this is the only signal that sends
    // the table back to page 1. Left empty, applying a filter on page 3 keeps
    // `offset` at 20 and the operator reads an empty table as "no matches".
    filterValues: [currentFilter],
  });

  return { data, loading, pageTotal, page, setPage, limit, setLimit };
}

export function useQueryConsumptionOrder(id: string) {
  const { data, loading } = useQuery(ConsumptionOrderDocument, {
    variables: { id },
    skip: !id,
    fetchPolicy: 'cache-and-network',
  });

  return { order: data?.consumptionOrder, loading };
}
