'use client';

// Side-effect import that loads ambient global declarations
// (FC alias, *.scss / *.svg module declarations) consumed by
// the migrated components.
import './globals';

// Page components — drop-in for Next.js Pages-Router shells.
export { default as ChangeHistory } from './components/pages/change-history';
export { default as ConsumptionOrders } from './components/pages/consumption-orders';
export { default as InventoryCount } from './components/pages/inventory-count';
export { default as InventoryList } from './components/pages/inventory-list';
export { default as InventoryMovement } from './components/pages/inventory-movement';
export { default as LabelSearch } from './components/pages/label-search';
export { default as LoadersManagement } from './components/pages/loaders-management';
export { default as LocationsManagement } from './components/pages/locations-management';
export { default as Maps, type MapsProps } from './components/pages/maps';
export { default as MaterialsManagement } from './components/pages/materials-management';
export { default as ReceiveInventoryOrders } from './components/pages/receive-inventory-orders';
export { default as ShipInventoryOrders } from './components/pages/ship-inventory-orders';

// Sub-page components used by dynamic route shells.
export { default as CreateLoader } from './components/pages/loaders-management/List/create';
export { default as EditReceiveInventoryOrder } from './components/pages/receive-inventory-orders/edit';
export { default as ViewReceiveInventoryOrder } from './components/pages/receive-inventory-orders/view';
export { default as EditShipInventoryOrder } from './components/pages/ship-inventory-orders/edit';
export { default as ViewShipInventoryOrder } from './components/pages/ship-inventory-orders/view';
export { default as EditTransferOrder } from './components/pages/inventory-movement/transfer-order';
export { default as ViewInventoryCount } from './components/pages/inventory-count/view';
export { default as ViewConsumptionOrder } from './components/pages/consumption-orders/view';

// Apollo client factory + default singleton.
export { createApolloClient, default as ApolloClient } from './apollo';

// Providers consumed by app shells.
export { default as DialogProvider } from './components/dialog/DialogProvider';
// Optional: mount it to make an order's upstream documents clickable. Leaving
// it out renders them as plain text rather than breaking anything.
export {
  default as OrderReferenceProvider,
  type OrderReferenceProviderProps,
} from './components/orderReference/OrderReferenceProvider';
export { default as OrderReferenceList } from './components/orderReference/OrderReferenceList';
export {
  useOrderReference,
  type OrderReferenceValue,
  type OrderReferenceLinkResolver,
  type OrderReferenceLabelResolver,
  type OrderReferenceContextValues,
} from './components/orderReference/context';
export { useOrderReferences } from './components/orderReference/useOrderReferences';
export { default as ModalProvider } from './components/modal/ModalProvider';
export {
  default as InventoryActionsProvider,
  type InventoryActionsProviderProps,
} from './components/inventoryActions/InventoryActionsProvider';

// Inventory actions: the enum a deployment switches on/off, the action↔operation
// mapping that keeps the frontend and backend switches derived from one source,
// and the context hook exposing the filtered option list.
export {
  InventoryActions,
  type InventoryActionItem,
} from './components/inventoryActions/utils';
export {
  INVENTORY_ACTION_OPERATIONS,
  INVENTORY_ACTION_DOCUMENT_NAMES,
  inventoryActionsForOperation,
  type InventoryActionOperation,
} from './components/inventoryActions/operations';
export {
  useInventoryActions,
  useAddInventories,
} from './components/inventoryActions/useInventoryActions';
export {
  DEFAULT_INVENTORY_ACTION_ERROR_MESSAGE,
  type InventoryActionsContextValues,
} from './components/inventoryActions/InventoryActionsContext';

// Generic hooks.
export { useColumnWidthPersistence } from './hooks/useColumnWidthPersistence';
export { useFormCancel } from './hooks/useFormCancel';
export { usePreviousValue } from './hooks/usePreviousValue';
export { useRoutes } from './hooks/useRoutes';
export {
  useFetchMoreOptions,
  useInsertOption,
} from './hooks/useSelectorOptions';
export { useSortTable } from './hooks/useSortTable';
export {
  useTablePageState,
  useTablePageTotal,
} from './hooks/useTablePagination';

// Icon set used by the lib (re-exported for consumer convenience).
export * from './icons';

// Route constants (NextPath enum) and path helpers.
export { NextPath } from './utils/nextpath';
export { nextDynamicPath } from './utils/path';

// Generated GraphQL operations and types.
export * from './graphql/generated/.graphql';
