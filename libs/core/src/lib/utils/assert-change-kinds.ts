/**
 * Refuse to move stock for an item whose change rows lack a `kind`.
 *
 * `sumShipChanges` / `sumTransferChanges` count a NULL-kind row for nothing,
 * which is fine for reading but wrong for writing: an executed or cancelled
 * quantity would be ignored, the pending quantity over-stated, and the item
 * could be moved or released twice. So every path that writes the ledger calls
 * this first, and the upgrade SQL (integration guide, section 4.8) has to run
 * before such an item can move.
 */
export const assertChangesHaveKind = (
  itemId: string,
  changes: readonly { readonly kind?: string | null }[],
): void => {
  if (changes.some((change) => change.kind == null)) {
    throw new Error(
      `Item ${itemId} has change rows without a kind; run the upgrade SQL in integration-guide §4.8 before moving its stock`,
    );
  }
};
