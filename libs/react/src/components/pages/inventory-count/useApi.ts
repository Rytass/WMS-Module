import { useQuery, useMutation, useLazyQuery } from '@apollo/client/react';
import {
  useTablePageState,
  useTablePageTotal,
} from '../../../hooks/useTablePagination';
import { useTableSort } from '../../../hooks/useTableSort';
import {
  AddInventoryCountItemDocument,
  CancelInventoryCountDocument,
  CountInventoryDocument,
  CreateInventoryCountOrderDocument,
  InventoryCountOrderDocument,
  InventoryCountOrderItemsDocument,
  InventoryCountOrdersDocument,
  InventoryCountStatus,
  MaterialDocument,
  RemoveInventoryCountItemDocument,
  ResetInventoryCountDocument,
  SettleInventoryCountDocument,
  StartInventoryCountDocument,
  UpdateInventoryCountOrderDocument,
  InventoryCountOrderSortField,
  InventoryCountOrderItemSortField,
} from '../../../graphql/generated/.graphql';
import { FilterValues, ItemFilterValues } from './typing';

/**
 * Every mutation on the detail page invalidates both halves of it: the header
 * (status, timestamps) and the count sheet, which now arrives through its own
 * paginated query rather than as a field of the order.
 */
const refetchOrder = [
  InventoryCountOrderDocument,
  InventoryCountOrderItemsDocument,
];

/**
 * The add-stock modal needs the chosen material's unit list (base unit +
 * conversions) to offer the 單位 select — the material picker itself only
 * carries `{ id, key }`.
 */
export function useLazyQueryMaterial() {
  const [fetchMaterial] = useLazyQuery(MaterialDocument, {
    fetchPolicy: 'cache-and-network',
  });

  return { fetchMaterial };
}

/** Table column key → `InventoryCountOrderSortField`; columns not listed do not sort. */
const INVENTORY_COUNT_ORDER_SORT_FIELDS = {
  name: InventoryCountOrderSortField.NAME,
  countDate: InventoryCountOrderSortField.COUNT_DATE,
  createdBy: InventoryCountOrderSortField.CREATED_BY,
  status: InventoryCountOrderSortField.STATUS,
} as const;

export function useQueryInventoryCountOrders(filter?: FilterValues) {
  const { page, setPage, limit, setLimit, offset } = useTablePageState();
  const { sort, getColumnSortProps } = useTableSort({
    fields: INVENTORY_COUNT_ORDER_SORT_FIELDS,
    setPage,
  });

  const { data, loading } = useQuery(InventoryCountOrdersDocument, {
    variables: {
      sort,
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

export function useQueryInventoryCountOrder(id: string) {
  const { data, loading, refetch } = useQuery(InventoryCountOrderDocument, {
    variables: { id },
    skip: !id,
    fetchPolicy: 'cache-and-network',
  });

  return { data, loading, refetch };
}

/** Table column key → `InventoryCountOrderItemSortField`; columns not listed do not sort. */
const INVENTORY_COUNT_ORDER_ITEM_SORT_FIELDS = {
  inspectionResult: InventoryCountOrderItemSortField.INSPECTION,
  held: InventoryCountOrderItemSortField.HELD,
  inTransfer: InventoryCountOrderItemSortField.IN_TRANSFER,
  materialKey: InventoryCountOrderItemSortField.MATERIAL_KEY,
  materialDescription: InventoryCountOrderItemSortField.MATERIAL_DESCRIPTION,
  batch: InventoryCountOrderItemSortField.BATCH_KEY,
  location: InventoryCountOrderItemSortField.LOCATION_KEY,
  loader: InventoryCountOrderItemSortField.LOADER_SERIAL_ID,
  vendorId: InventoryCountOrderItemSortField.VENDOR_ID,
  customerId: InventoryCountOrderItemSortField.CUSTOMER_ID,
  saleId: InventoryCountOrderItemSortField.SALE_ID,
  saleSerialId: InventoryCountOrderItemSortField.SALE_SERIAL_ID,
} as const;

/**
 * The count sheet: filtered, paginated, and fetched apart from the header.
 *
 * A sheet covering a whole aisle runs to thousands of lines, and the operator
 * only ever works on the shelf in front of them, so the filters and the page
 * both belong on the server.
 */
export function useQueryInventoryCountOrderItems(
  id: string,
  filter?: ItemFilterValues,
) {
  const { page, setPage, limit, setLimit, offset } = useTablePageState();
  const { sort, getColumnSortProps } = useTableSort({
    fields: INVENTORY_COUNT_ORDER_ITEM_SORT_FIELDS,
    setPage,
  });

  const variables = {
    sort,
    id,
    limit,
    offset,
    materialKey: filter?.materialKey || undefined,
    materialDescription: filter?.materialDescription || undefined,
    batchKey: filter?.batchKey || undefined,
    locationKey: filter?.locationKey || undefined,
    loaderSerialId: filter?.loaderSerialId || undefined,
    vendorId: filter?.vendorId || undefined,
    customerId: filter?.customerId || undefined,
    saleId: filter?.saleId || undefined,
    saleSerialId: filter?.saleSerialId || undefined,
    onlyVariance: filter?.onlyVariance || undefined,
  };

  const { data, loading } = useQuery(InventoryCountOrderItemsDocument, {
    variables,
    skip: !id,
    fetchPolicy: 'cache-and-network',
  });

  const { pageTotal } = useTablePageTotal({
    page,
    total: data?.inventoryCountOrderItems.total,
    setPage,
    filterValues: [
      filter?.materialKey,
      filter?.materialDescription,
      filter?.batchKey,
      filter?.locationKey,
      filter?.loaderSerialId,
      filter?.vendorId,
      filter?.customerId,
      filter?.saleId,
      filter?.saleSerialId,
      String(filter?.onlyVariance ?? false),
    ],
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

/**
 * The whole sheet in one shot, for the CSV download.
 *
 * `CSV_EXPORT_LIMIT` is deliberately far above any realistic count: the export
 * has to be the complete sheet or it is worse than useless — an operator would
 * fill in a truncated file and silently write off everything missing from it.
 */
export const CSV_EXPORT_LIMIT = 100000;

export function useLazyQueryAllInventoryCountOrderItems() {
  const [fetchAllItems] = useLazyQuery(InventoryCountOrderItemsDocument, {
    fetchPolicy: 'network-only',
  });

  return { fetchAllItems };
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
