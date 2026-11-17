import { useQuery, useMutation } from '@apollo/client/react';
import {
  useTablePageState,
  useTablePageTotal,
} from '../../../hooks/useTablePagination';
import { useTableSort } from '../../../hooks/useTableSort';
import {
  ReceiveInventoryOrdersDocument,
  ReceiveInventoryOrderDocument,
  CreateReceiveInventoryOrderDocument,
  UpdateReceiveInventoryOrderDocument,
  ReceiveInventoryOrderSortField,
} from '../../../graphql/generated/.graphql';

/** Table column key → `ReceiveInventoryOrderSortField`; columns not listed do not sort. */
const RECEIVE_ORDER_SORT_FIELDS = {
  status: ReceiveInventoryOrderSortField.STATUS,
  key: ReceiveInventoryOrderSortField.KEY,
  createdBy: ReceiveInventoryOrderSortField.CREATED_BY,
  createdAt: ReceiveInventoryOrderSortField.CREATED_AT,
  description: ReceiveInventoryOrderSortField.DESCRIPTION,
} as const;

export function useQueryReceiveInventoryOrders() {
  const { page, setPage, limit, setLimit, offset } = useTablePageState();
  const { sort, getColumnSortProps } = useTableSort({
    fields: RECEIVE_ORDER_SORT_FIELDS,
    setPage,
  });

  const { data, loading } = useQuery(ReceiveInventoryOrdersDocument, {
    variables: {
      sort,
      limit,
      offset,
    },
    fetchPolicy: 'cache-and-network',
  });

  const { pageTotal } = useTablePageTotal({
    page,
    total: data?.receiveInventoryOrders.total,
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

export function useQueryReceiveInventoryOrder(id: string) {
  const { data, loading } = useQuery(ReceiveInventoryOrderDocument, {
    variables: {
      receiveInventoryOrderId: id,
    },
    fetchPolicy: 'cache-and-network',
  });

  return {
    data,
    loading,
  };
}

export function useCreateReceiveInventoryOrder() {
  const [createReceiveInventoryOrder] = useMutation(
    CreateReceiveInventoryOrderDocument,
  );

  return {
    createReceiveInventoryOrder,
  };
}

export function useUpdateReceiveInventoryOrder() {
  const [updateReceiveInventoryOrder, { loading }] = useMutation(
    UpdateReceiveInventoryOrderDocument,
  );

  return {
    updateReceiveInventoryOrder,
    loading,
  };
}
