import { useQuery, useLazyQuery, useMutation } from '@apollo/client/react';
import {
  useTablePageState,
  useTablePageTotal,
} from '../../../hooks/useTablePagination';
import { useTableSort } from '../../../hooks/useTableSort';
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
  TransferOrderSortField,
  ReceiveInventoryOrderSortField,
  ShipInventoryOrderSortField,
} from '../../../graphql/generated/.graphql';
import { FilterType } from '../../FilterWrapper/typing';
import { FilterValues as TransferFilterValues } from './Transfer/typing';
import { FilterValues as ShipFilterValues } from './Ship/typing';
import { FilterValues as ReceiveFilterValues } from './Receive/typing';

/** Table column key → `TransferOrderSortField`; columns not listed do not sort. */
const TRANSFER_ORDER_SORT_FIELDS = {
  key: TransferOrderSortField.KEY,
  receiver: TransferOrderSortField.RECEIVER,
  createdBy: TransferOrderSortField.CREATED_BY,
  createdAt: TransferOrderSortField.CREATED_AT,
  description: TransferOrderSortField.DESCRIPTION,
} as const;

export function useQueryTransferOrders(currentFilter?: TransferFilterValues) {
  const { page, setPage, limit, setLimit, offset } = useTablePageState();
  const { sort, getColumnSortProps } = useTableSort({
    fields: TRANSFER_ORDER_SORT_FIELDS,
    setPage,
  });

  const { data, loading } = useQuery(TransferOrdersDocument, {
    variables: {
      sort,
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
    getColumnSortProps,
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

/** Table column key → `ShipInventoryOrderSortField`; columns not listed do not sort. */
const SHIP_ORDER_SORT_FIELDS = {
  key: ShipInventoryOrderSortField.KEY,
  createdBy: ShipInventoryOrderSortField.CREATED_BY,
  createdAt: ShipInventoryOrderSortField.CREATED_AT,
  description: ShipInventoryOrderSortField.DESCRIPTION,
} as const;

export function useQueryShipInventoryOrders(currentFilter?: ShipFilterValues) {
  const { page, setPage, limit, setLimit, offset } = useTablePageState();
  const { sort, getColumnSortProps } = useTableSort({
    fields: SHIP_ORDER_SORT_FIELDS,
    setPage,
  });

  const { data, loading } = useQuery(FullShipInventoryOrdersDocument, {
    variables: {
      sort,
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
    getColumnSortProps,
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

/** Table column key → `ReceiveInventoryOrderSortField`; columns not listed do not sort. */
const RECEIVE_ORDER_SORT_FIELDS = {
  key: ReceiveInventoryOrderSortField.KEY,
  createdBy: ReceiveInventoryOrderSortField.CREATED_BY,
  createdAt: ReceiveInventoryOrderSortField.CREATED_AT,
  description: ReceiveInventoryOrderSortField.DESCRIPTION,
} as const;

export function useQueryReceiveInventoryOrders(
  currentFilter?: ReceiveFilterValues,
) {
  const { page, setPage, limit, setLimit, offset } = useTablePageState();
  const { sort, getColumnSortProps } = useTableSort({
    fields: RECEIVE_ORDER_SORT_FIELDS,
    setPage,
  });

  const { data, loading } = useQuery(FullReceiveInventoryOrdersDocument, {
    variables: {
      sort,
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
    getColumnSortProps,
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
