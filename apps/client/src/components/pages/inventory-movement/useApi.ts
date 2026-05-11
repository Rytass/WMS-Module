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
  UpdateTransferOrderDocument,
  TransferDocument,
  ReceiveDocument,
  ShipDocument,
  CancelTransferDocument,
  CancelShipDocument,
} from '../../../graphql/generated/.graphql';
import { FilterType } from '../../FilterWrapper/typing';
import { FilterValues as TransferFilterValues } from './Transfer/typing';
import { FilterValues as ShipFilterValues } from './Ship/typing';
import { FilterValues as ReceiveFilterValues } from './Receive/typing';

export function useQueryTransferOrders(currentFilter?: TransferFilterValues) {
  const { page, setPage, limit, setLimit, offset } = useTablePageState();

  const { data, loading } = useQuery(TransferOrdersDocument, {
    variables: {
      limit,
      offset,
      key:
        currentFilter?.transferOrder?.name ||
        currentFilter?.['transferOrder-search'] ||
        undefined,
      materialKey:
        currentFilter?.[FilterType.material]?.name ||
        currentFilter?.['material-search'] ||
        undefined,
      batchKey:
        currentFilter?.[FilterType.batch]?.name ||
        currentFilter?.['batch-search'] ||
        undefined,
      description: currentFilter?.[FilterType.materialDescription] || undefined,
      targetLocationKey:
        currentFilter?.targetLocation?.name ||
        currentFilter?.['targetLocation-search'] ||
        undefined,
      targetLoaderKey:
        currentFilter?.targetLoader?.name ||
        currentFilter?.['targetLoader-search'] ||
        undefined,
      locationKey:
        currentFilter?.sourceLocation?.name ||
        currentFilter?.['sourceLocation-search'] ||
        undefined,
      loaderKey:
        currentFilter?.sourceLoader?.name ||
        currentFilter?.['sourceLoader-search'] ||
        undefined,
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

export function useQueryShipInventoryOrders(currentFilter?: ShipFilterValues) {
  const { page, setPage, limit, setLimit, offset } = useTablePageState();

  const { data, loading } = useQuery(FullShipInventoryOrdersDocument, {
    variables: {
      limit,
      offset,
      statuses: [
        ShipInventoryOrderStatus.PARTIAL_SHIPPED,
        ShipInventoryOrderStatus.PENDING,
      ],
      key:
        currentFilter?.shipOrder?.name ||
        currentFilter?.['shipOrder-search'] ||
        undefined,
      materialKey:
        currentFilter?.[FilterType.material]?.name ||
        currentFilter?.['material-search'] ||
        undefined,
      batchKey:
        currentFilter?.[FilterType.batch]?.name ||
        currentFilter?.['batch-search'] ||
        undefined,
      description: currentFilter?.[FilterType.materialDescription] || undefined,
      locationKey:
        currentFilter?.location?.name ||
        currentFilter?.['location-search'] ||
        undefined,
      loaderKey:
        currentFilter?.loader?.name ||
        currentFilter?.['loader-search'] ||
        undefined,
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

export function useQueryReceiveInventoryOrders(
  currentFilter?: ReceiveFilterValues,
) {
  const { page, setPage, limit, setLimit, offset } = useTablePageState();

  const { data, loading } = useQuery(FullReceiveInventoryOrdersDocument, {
    variables: {
      limit,
      offset,
      statuses: [
        ReceiveInventoryOrderStatus.PARTIAL_RECEIVED,
        ReceiveInventoryOrderStatus.PENDING,
      ],
      key:
        currentFilter?.receiveOrder?.name ||
        currentFilter?.['receiveOrder-search'] ||
        undefined,
      materialKey:
        currentFilter?.[FilterType.material]?.name ||
        currentFilter?.['material-search'] ||
        undefined,
      batchKey:
        currentFilter?.[FilterType.batch]?.name ||
        currentFilter?.['batch-search'] ||
        undefined,
      description: currentFilter?.[FilterType.materialDescription] || undefined,
      locationKey:
        currentFilter?.location?.name ||
        currentFilter?.['location-search'] ||
        undefined,
      loaderKey:
        currentFilter?.loader?.name ||
        currentFilter?.['loader-search'] ||
        undefined,
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

export function useUpdateTransferOrder() {
  const [updateTransferOrder, { loading }] = useMutation(
    UpdateTransferOrderDocument,
    {
      refetchQueries: [TransferOrdersDocument],
    },
  );

  return {
    updateTransferOrder,
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

export function useCancelTransfer() {
  const [cancelTransfer, { loading }] = useMutation(CancelTransferDocument, {
    refetchQueries: [TransferOrdersDocument],
  });

  return {
    cancelTransfer,
    loading,
  };
}

export function useCancelShip() {
  const [cancelShip, { loading }] = useMutation(CancelShipDocument, {
    refetchQueries: [FullShipInventoryOrdersDocument],
  });

  return {
    cancelShip,
    loading,
  };
}
