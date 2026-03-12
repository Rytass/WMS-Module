import { useQuery, useMutation } from '@apollo/client/react';
import {
  useTablePageState,
  useTablePageTotal,
} from '../../../hooks/useTablePagination';
import {
  ShipInventoryOrdersDocument,
  ShipInventoryOrderDocument,
  CreateShipInventoryOrderDocument,
  UpdateShipInventoryOrderDocument,
} from '../../../graphql/generated/.graphql';

export function useQueryShipInventoryOrders() {
  const { page, setPage, limit, setLimit, offset } = useTablePageState();

  const { data, loading } = useQuery(ShipInventoryOrdersDocument, {
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
  const [updateShipInventoryOrder] = useMutation(
    UpdateShipInventoryOrderDocument,
  );

  return {
    updateShipInventoryOrder,
  };
}
