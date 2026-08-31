import { InventoryActions } from './utils';

/**
 * The single source of truth linking a UI inventory action to (a) the GraphQL
 * document it sends and (b) the backend authorization/registration operation
 * name that guards it.
 *
 * Why this table exists
 * --------------------
 * A deployment that switches an action off usually wants it gone from *both*
 * ends: the button hidden here, and the mutation refused (or unregistered) in
 * `@rytass/wms-module-graphql`. Without a published mapping a consumer has to
 * reverse-engineer it by reading which `*Document` each action's `onSubmit`
 * sends, and the two configurations drift apart silently.
 *
 * The `operation` strings are the same `${resource}:${action}` names that
 * `@WmsOperation` declares on the resolver and that the `authChecker`
 * requirement carries, so one host-side constant can drive both
 * `InventoryActionsProvider.disabledActions` and the module's
 * `disabledOperations`.
 *
 * This file deliberately duplicates the strings rather than importing them from
 * `@rytass/wms-module-core`: `libs/react` ships to the browser and must stay
 * free of any backend dependency. A drift test in `libs/graphql` asserts every
 * value here exists in the backend's operation-name union.
 */
export interface InventoryActionOperation {
  /** `operationName` of the GraphQL document this action sends. */
  readonly document: string;
  /** Backend `${resource}:${action}` operation name guarding that document. */
  readonly operation: string;
}

export const INVENTORY_ACTION_OPERATIONS: Readonly<
  Record<InventoryActions, InventoryActionOperation>
> = {
  [InventoryActions.CreateTransferInventory]: {
    document: 'CreateTransferOrder',
    operation: 'transfer-order:create',
  },
  [InventoryActions.HoldInventory]: {
    document: 'CreateHoldInventoryOrder',
    operation: 'hold-inventory-order:create',
  },
  [InventoryActions.ReleaseInventoryHold]: {
    document: 'Release',
    operation: 'hold-inventory-order:release',
  },
  [InventoryActions.AllocateInventory]: {
    document: 'CreateAllocateInventoryOrder',
    operation: 'allocate-inventory-order:create',
  },
  [InventoryActions.DeallocateInventory]: {
    document: 'Deallocate',
    operation: 'allocate-inventory-order:deallocate',
  },
  [InventoryActions.ShipInventory]: {
    document: 'UpdateShipInventoryOrder',
    operation: 'ship-inventory-order:update',
  },
  [InventoryActions.SplitBatch]: {
    document: 'SplitBatch',
    operation: 'batch:split',
  },
  [InventoryActions.MergeBatch]: {
    document: 'MergeBatch',
    operation: 'batch:merge',
  },
  [InventoryActions.ReclassifyInventory]: {
    document: 'ReclassifyInventoryOrder',
    operation: 'reclassify-inventory-order:reclassify',
  },
  [InventoryActions.TransferToVendor]: {
    document: 'CreateTransferVendorOrder',
    operation: 'transfer-vendor-order:create',
  },
  [InventoryActions.ReturnFromVendor]: {
    document: 'ReturnTransferVendorOrder',
    operation: 'transfer-vendor-order:return',
  },
  [InventoryActions.QualityInspection]: {
    document: 'InspectMaterials',
    operation: 'quality-inspection-order:inspect',
  },
  [InventoryActions.DeliverToCustomer]: {
    document: 'CreateTransferCustomerOrder',
    operation: 'transfer-customer-order:create',
  },
  [InventoryActions.ReturnFromCustomer]: {
    document: 'ReturnTransferCustomerOrder',
    operation: 'transfer-customer-order:return',
  },
  [InventoryActions.ScrapInventory]: {
    document: 'ScrapeMaterials',
    operation: 'scrape-order:scrape',
  },
};

/** Every inventory action whose backend operation matches `operation`. */
export function inventoryActionsForOperation(
  operation: string,
): InventoryActions[] {
  return (
    Object.keys(INVENTORY_ACTION_OPERATIONS) as InventoryActions[]
  ).filter(
    (action) => INVENTORY_ACTION_OPERATIONS[action].operation === operation,
  );
}

/**
 * `operationName`s of the 15 mutations the inventory-action layer sends.
 *
 * The layer reports its own failures (see `useInventoryActionError`), so the
 * Apollo `ErrorLink` in `src/apollo` skips these to avoid showing the same
 * error twice. Every other operation still relies on the link as the safety net.
 */
export const INVENTORY_ACTION_DOCUMENT_NAMES: ReadonlySet<string> = new Set(
  Object.values(INVENTORY_ACTION_OPERATIONS).map(({ document }) => document),
);
