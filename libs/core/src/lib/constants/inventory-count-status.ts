/**
 * The lifecycle of an inventory count order, matching the four states the
 * design shows on the list page.
 *
 * Only `COUNTING` accepts counted quantities, and only `COUNTING` locks the
 * scoped locations; `COMPLETED` is reached exclusively by settling the variance,
 * so an order that was counted but never settled stays `COUNTING` for as long as
 * it takes.
 */
export enum InventoryCountStatus {
  /** 尚未執行 — created, scope fixed, nothing counted, nothing locked. */
  PENDING = 'PENDING',
  /** 盤點中 — book quantities snapshotted and the scoped locations locked. */
  COUNTING = 'COUNTING',
  /** 已完成 — the variance was settled and stock adjusted. */
  COMPLETED = 'COMPLETED',
  /** 已取消 — abandoned from either PENDING or COUNTING; nothing adjusted. */
  CANCELLED = 'CANCELLED',
}
