import { useQuery, useLazyQuery } from '@apollo/client/react';
import {
  useTablePageState,
  useTablePageTotal,
} from '../../../hooks/useTablePagination';
import {
  TransferOrdersDocument,
  FullShipInventoryOrdersDocument,
  ShipInventoryOrderDocument,
  FullReceiveInventoryOrdersDocument,
  ReceiveInventoryOrderDocument,
} from '../../../graphql/generated/.graphql';

export function useQueryTransferOrders() {
  const { page, setPage, limit, setLimit, offset } = useTablePageState();

  const { data, loading } = useQuery(TransferOrdersDocument, {
    variables: {
      limit,
      offset,
    },
    fetchPolicy: 'cache-and-network',
  });

  const { pageTotal } = useTablePageTotal({
    page,
    total: data?.transferOrders.total,
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

export function useQueryShipInventoryOrders() {
  const { page, setPage, limit, setLimit, offset } = useTablePageState();

  const { data, loading } = useQuery(FullShipInventoryOrdersDocument, {
    variables: {
      limit,
      offset,
    },
    fetchPolicy: 'cache-and-network',
  });

  const { pageTotal } = useTablePageTotal({
    page,
    total: data?.shipInventoryOrders.total,
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

export function useLazyQueryShipInventoryOrder() {
  const [fetchShipInventoryOrder, { data, loading }] = useLazyQuery(
    ShipInventoryOrderDocument,
    {
      fetchPolicy: 'cache-and-network',
    },
  );

  return {
    fetchShipInventoryOrder,
    data,
    loading,
  };
}

export function useQueryReceiveInventoryOrders() {
  const { page, setPage, limit, setLimit, offset } = useTablePageState();

  const { data, loading } = useQuery(FullReceiveInventoryOrdersDocument, {
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

export function useLazyQueryReceiveInventoryOrder() {
  const [fetchReceiveInventoryOrder, { data, loading }] = useLazyQuery(
    ReceiveInventoryOrderDocument,
    {
      fetchPolicy: 'cache-and-network',
    },
  );

  return {
    fetchReceiveInventoryOrder,
    data,
    loading,
  };
}
