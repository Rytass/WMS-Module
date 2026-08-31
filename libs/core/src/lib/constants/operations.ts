/**
 * @file operations.ts
 * The canonical list of every root operation this package exposes, named the
 * same way `@WmsOperation` declares it: `` `${resource}:${action}` ``.
 *
 * One name, three uses
 * --------------------
 * 1. The `requirement` a consumer's `authChecker` receives.
 * 2. The key for `enabledOperations` / `disabledOperations` — the deployment
 *    switch that decides whether a resolver is registered in the schema at all.
 * 3. The value `@rytass/wms-module-react`'s `INVENTORY_ACTION_OPERATIONS` maps
 *    each UI action to, so a host can derive its frontend and backend switches
 *    from one constant.
 *
 * These strings are internal metadata — they never appear in the GraphQL schema
 * — so refining one is not a GraphQL breaking change, but it *is* a breaking
 * change for consumers keying off it. Treat the union as public API.
 *
 * **Invariant:** this union must list exactly the requirements declared by
 * `@WmsOperation` across `libs/graphql`, no more and no less.
 * `libs/graphql/src/lib/operation-names.invariant.spec.ts` fails otherwise, so a
 * new resolver that forgets to add its name here cannot merge.
 *
 * Note that a name is **not** unique per schema field: several queries share one
 * requirement (`loader:read` covers 6 fields, `stock:read` 5, `material:read` and
 * `loader:create` 3 each, and 7 more cover 2). Disabling a name disables every
 * field carrying it — use `disabledFields` when you need finer granularity.
 */
export type WmsOperationName =
  // ── Allocate inventory order ────────────────────────────────────────────── //
  | 'allocate-inventory-order:create'
  | 'allocate-inventory-order:deallocate'
  | 'allocate-inventory-order:read'
  | 'allocate-inventory-order:update'
  // ── Batch ───────────────────────────────────────────────────────────────── //
  | 'batch:merge'
  | 'batch:read'
  | 'batch:split'
  // ── Hold inventory order ────────────────────────────────────────────────── //
  | 'hold-inventory-order:create'
  | 'hold-inventory-order:read'
  | 'hold-inventory-order:release'
  | 'hold-inventory-order:update'
  // ── Inventory count order ───────────────────────────────────────────────── //
  | 'inventory-count-order:add-item'
  | 'inventory-count-order:cancel'
  | 'inventory-count-order:count'
  | 'inventory-count-order:create'
  | 'inventory-count-order:read'
  | 'inventory-count-order:read-items'
  | 'inventory-count-order:remove-item'
  | 'inventory-count-order:reset'
  | 'inventory-count-order:settle'
  | 'inventory-count-order:start'
  | 'inventory-count-order:update'
  // ── Loader ──────────────────────────────────────────────────────────────── //
  | 'loader:create'
  | 'loader:read'
  | 'loader:update'
  // ── Location ────────────────────────────────────────────────────────────── //
  | 'location:create'
  | 'location:read'
  | 'location:update'
  // ── Material ────────────────────────────────────────────────────────────── //
  | 'material:create'
  | 'material:read'
  | 'material:update'
  // ── Quality inspection order ────────────────────────────────────────────── //
  | 'quality-inspection-order:inspect'
  // ── Receive inventory order ─────────────────────────────────────────────── //
  | 'receive-inventory-order:create'
  | 'receive-inventory-order:read'
  | 'receive-inventory-order:receive'
  | 'receive-inventory-order:update'
  // ── Reclassify inventory order ──────────────────────────────────────────── //
  | 'reclassify-inventory-order:reclassify'
  // ── Sale order ──────────────────────────────────────────────────────────── //
  | 'sale-order:read'
  // ── Scrape order ────────────────────────────────────────────────────────── //
  | 'scrape-order:scrape'
  // ── Ship inventory order ────────────────────────────────────────────────── //
  | 'ship-inventory-order:cancel'
  | 'ship-inventory-order:create'
  | 'ship-inventory-order:read'
  | 'ship-inventory-order:ship'
  | 'ship-inventory-order:update'
  // ── Stock ───────────────────────────────────────────────────────────────── //
  | 'stock:read'
  // ── Transfer customer order ─────────────────────────────────────────────── //
  | 'transfer-customer-order:create'
  | 'transfer-customer-order:return'
  | 'transfer-customer-order:update'
  // ── Transfer order ──────────────────────────────────────────────────────── //
  | 'transfer-order:cancel'
  | 'transfer-order:create'
  | 'transfer-order:read'
  | 'transfer-order:transfer'
  | 'transfer-order:update'
  // ── Transfer vendor order ───────────────────────────────────────────────── //
  | 'transfer-vendor-order:create'
  | 'transfer-vendor-order:return'
  | 'transfer-vendor-order:update'
  // ── Unit ────────────────────────────────────────────────────────────────── //
  | 'unit:read'
  // ── Warehouse map ───────────────────────────────────────────────────────── //
  | 'warehouse-map:read'
  | 'warehouse-map:update';

/**
 * Runtime counterpart of {@link WmsOperationName}. Iterate it to build a UI, to
 * diff against a host's own allow-list, or to assert the invariant above.
 */
export const WMS_OPERATION_NAMES: readonly WmsOperationName[] = [
  'allocate-inventory-order:create',
  'allocate-inventory-order:deallocate',
  'allocate-inventory-order:read',
  'allocate-inventory-order:update',
  'batch:merge',
  'batch:read',
  'batch:split',
  'hold-inventory-order:create',
  'hold-inventory-order:read',
  'hold-inventory-order:release',
  'hold-inventory-order:update',
  'inventory-count-order:add-item',
  'inventory-count-order:cancel',
  'inventory-count-order:count',
  'inventory-count-order:create',
  'inventory-count-order:read',
  'inventory-count-order:read-items',
  'inventory-count-order:remove-item',
  'inventory-count-order:reset',
  'inventory-count-order:settle',
  'inventory-count-order:start',
  'inventory-count-order:update',
  'loader:create',
  'loader:read',
  'loader:update',
  'location:create',
  'location:read',
  'location:update',
  'material:create',
  'material:read',
  'material:update',
  'quality-inspection-order:inspect',
  'receive-inventory-order:create',
  'receive-inventory-order:read',
  'receive-inventory-order:receive',
  'receive-inventory-order:update',
  'reclassify-inventory-order:reclassify',
  'sale-order:read',
  'scrape-order:scrape',
  'ship-inventory-order:cancel',
  'ship-inventory-order:create',
  'ship-inventory-order:read',
  'ship-inventory-order:ship',
  'ship-inventory-order:update',
  'stock:read',
  'transfer-customer-order:create',
  'transfer-customer-order:return',
  'transfer-customer-order:update',
  'transfer-order:cancel',
  'transfer-order:create',
  'transfer-order:read',
  'transfer-order:transfer',
  'transfer-order:update',
  'transfer-vendor-order:create',
  'transfer-vendor-order:return',
  'transfer-vendor-order:update',
  'unit:read',
  'warehouse-map:read',
  'warehouse-map:update',
];
