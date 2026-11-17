import { useQuery, useMutation } from '@apollo/client/react';
import {
  useTablePageState,
  useTablePageTotal,
} from '../../../hooks/useTablePagination';
import { useTableSort } from '../../../hooks/useTableSort';
import {
  ShipInventoryOrdersDocument,
  ShipInventoryOrderDocument,
  CreateShipInventoryOrderDocument,
  UpdateShipInventoryOrderDocument,
  ShipInventoryOrderSortField,
} from '../../../graphql/generated/.graphql';

/** Table column key → `ShipInventoryOrderSortField`; columns not listed do not sort. */
const SHIP_ORDER_SORT_FIELDS = {
  status: ShipInventoryOrderSortField.STATUS,
  key: ShipInventoryOrderSortField.KEY,
  createdBy: ShipInventoryOrderSortField.CREATED_BY,
  createdAt: ShipInventoryOrderSortField.CREATED_AT,
  description: ShipInventoryOrderSortField.DESCRIPTION,
} as const;

export function useQueryShipInventoryOrders() {
  const { page, setPage, limit, setLimit, offset } = useTablePageState();
  const { sort, getColumnSortProps } = useTableSort({
    fields: SHIP_ORDER_SORT_FIELDS,
    setPage,
  });

  const { data, loading } = useQuery(ShipInventoryOrdersDocument, {
    variables: {
      sort,
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
    getColumnSortProps,
  };
}

export function useQueryShipInventoryOrder(id: string) {
  const { data, loading } = useQuery(ShipInventoryOrderDocument, {
    variables: {
      shipInventoryOrderId: id,
    },
    fetchPolicy: 'cache-and-network',
  });

  return {
    data,
    loading,
  };
}

export function useCreateShipInventoryOrder() {
  const [createShipInventoryOrder] = useMutation(
    CreateShipInventoryOrderDocument,
  );

  return {
    createShipInventoryOrder,
  };
}

export function useUpdateShipInventoryOrder() {
  const [updateShipInventoryOrder, { loading }] = useMutation(
    UpdateShipInventoryOrderDocument,
  );

  return {
    updateShipInventoryOrder,
    loading,
  };
}
