import { useQuery, useMutation } from '@apollo/client/react';
import {
  useTablePageState,
  useTablePageTotal,
} from '../../../hooks/useTablePagination';
import {
  ReceiveInventoryOrdersDocument,
  ReceiveInventoryOrderDocument,
  CreateReceiveInventoryOrderDocument,
  UpdateReceiveInventoryOrderDocument,
} from '../../../graphql/generated/.graphql';

export function useQueryReceiveInventoryOrders() {
  const { page, setPage, limit, setLimit, offset } = useTablePageState();

  const { data, loading } = useQuery(ReceiveInventoryOrdersDocument, {
    variables: {
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
  const [updateReceiveInventoryOrder] = useMutation(
    UpdateReceiveInventoryOrderDocument,
  );

  return {
    updateReceiveInventoryOrder,
  };
}
