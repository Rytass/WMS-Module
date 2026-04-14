import { useQuery, useLazyQuery, useMutation } from '@apollo/client/react';
import {
  useTablePageState,
  useTablePageTotal,
} from '../../../hooks/useTablePagination';
import {
  TransferOrdersDocument,
  TransferOrderDocument,
  FullShipInventoryOrdersDocument,
  ShipInventoryOrderDocument,
  FullReceiveInventoryOrdersDocument,
  ReceiveInventoryOrderDocument,
  ShipInventoryOrderStatus,
  ReceiveInventoryOrderStatus,
  TransferDocument,
  ReceiveDocument,
  ShipDocument,
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

export function useLazyQueryTransferOrder() {
  const [fetchTransferOrder, { data, loading }] = useLazyQuery(
    TransferOrderDocument,
    {
      fetchPolicy: 'cache-and-network',
    },
  );

  return {
    fetchTransferOrder,
    data,
    loading,
  };
}

export function useQueryTransferOrder(id: string) {
  const { data, loading } = useQuery(TransferOrderDocument, {
    variables: {
      transferOrderId: id,
    },
    fetchPolicy: 'cache-and-network',
  });

  return {
    data,
    loading,
  };
}

export function useQueryShipInventoryOrders() {
  const { page, setPage, limit, setLimit, offset } = useTablePageState();

  const { data, loading } = useQuery(FullShipInventoryOrdersDocument, {
    variables: {
      limit,
      offset,
      statuses: [
        ShipInventoryOrderStatus.PARTIAL_SHIPPED,
        ShipInventoryOrderStatus.PENDING,
      ],
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
      statuses: [
        ReceiveInventoryOrderStatus.PARTIAL_RECEIVED,
        ReceiveInventoryOrderStatus.PENDING,
      ],
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

export function useTransfer() {
  const [transfer, { loading }] = useMutation(TransferDocument);

  return {
    transfer,
    loading,
  };
}

export function useReceive() {
  const [receive, { loading }] = useMutation(ReceiveDocument);

  return {
    receive,
    loading,
  };
}

export function useShip() {
  const [ship, { loading }] = useMutation(ShipDocument);

  return {
    ship,
    loading,
  };
}
