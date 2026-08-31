import { useQuery, useMutation } from '@apollo/client/react';
import {
  useTablePageState,
  useTablePageTotal,
} from '../../../hooks/useTablePagination';
import {
  AddInventoryCountItemDocument,
  CancelInventoryCountDocument,
  CountInventoryDocument,
  CreateInventoryCountOrderDocument,
  InventoryCountOrderDocument,
  InventoryCountOrdersDocument,
  InventoryCountStatus,
  RemoveInventoryCountItemDocument,
  ResetInventoryCountDocument,
  SettleInventoryCountDocument,
  StartInventoryCountDocument,
  UpdateInventoryCountOrderDocument,
} from '../../../graphql/generated/.graphql';
import { FilterValues } from './typing';

/** Every mutation on the detail page invalidates the order it acted on. */
const refetchOrder = [InventoryCountOrderDocument];

export function useQueryInventoryCountOrders(filter?: FilterValues) {
  const { page, setPage, limit, setLimit, offset } = useTablePageState();

  const { data, loading } = useQuery(InventoryCountOrdersDocument, {
    variables: {
      limit,
      offset,
      name: filter?.name || undefined,
      statuses: filter?.statuses?.length
        ? (filter.statuses as InventoryCountStatus[])
        : undefined,
      createdBy: filter?.createdBy || undefined,
      countDateFrom: filter?.countDateFrom || undefined,
      countDateTo: filter?.countDateTo || undefined,
      locationIds: filter?.locationIds?.length ? filter.locationIds : undefined,
    },
    fetchPolicy: 'cache-and-network',
  });

  const { pageTotal } = useTablePageTotal({
    page,
    total: data?.inventoryCountOrders.total,
    setPage,
    filterValues: [
      filter?.name,
      filter?.createdBy,
      filter?.countDateFrom,
      filter?.countDateTo,
      filter?.statuses?.join(','),
      filter?.locationIds?.join(','),
    ],
  });

  return { data, loading, pageTotal, page, setPage, limit, setLimit };
}

export function useQueryInventoryCountOrder(id: string) {
  const { data, loading, refetch } = useQuery(InventoryCountOrderDocument, {
    variables: { id },
    skip: !id,
    fetchPolicy: 'cache-and-network',
  });

  return { data, loading, refetch };
}

export function useInventoryCountMutations() {
  const [createInventoryCountOrder] = useMutation(
    CreateInventoryCountOrderDocument,
    { refetchQueries: [InventoryCountOrdersDocument] },
  );
  const [updateInventoryCountOrder] = useMutation(
    UpdateInventoryCountOrderDocument,
    { refetchQueries: refetchOrder },
  );
  const [startInventoryCount] = useMutation(StartInventoryCountDocument, {
    refetchQueries: refetchOrder,
  });
  const [countInventory] = useMutation(CountInventoryDocument, {
    refetchQueries: refetchOrder,
  });
  const [addInventoryCountItem] = useMutation(AddInventoryCountItemDocument, {
    refetchQueries: refetchOrder,
  });
  const [removeInventoryCountItem] = useMutation(
    RemoveInventoryCountItemDocument,
    { refetchQueries: refetchOrder },
  );
  const [resetInventoryCount] = useMutation(ResetInventoryCountDocument, {
    refetchQueries: refetchOrder,
  });
  const [cancelInventoryCount] = useMutation(CancelInventoryCountDocument, {
    refetchQueries: refetchOrder,
  });
  const [settleInventoryCount] = useMutation(SettleInventoryCountDocument, {
    refetchQueries: refetchOrder,
  });

  return {
    createInventoryCountOrder,
    updateInventoryCountOrder,
    startInventoryCount,
    countInventory,
    addInventoryCountItem,
    removeInventoryCountItem,
    resetInventoryCount,
    cancelInventoryCount,
    settleInventoryCount,
  };
}
