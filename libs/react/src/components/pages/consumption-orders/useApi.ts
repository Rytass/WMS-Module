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
    filterValues: [],
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
