import { useQuery, useMutation } from '@apollo/client/react';
import {
  useTablePageState,
  useTablePageTotal,
} from '../../../hooks/useTablePagination';
import {
  ShipInventoryOrdersDocument,
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
