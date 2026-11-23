/**
 * What an update may write for an existing line.
 *
 * A line carrying `removedAt` is being removed, not edited: the quantity checks
 * skip it, so whatever else it carries must not be stored either. Without this
 * `{ id, removedAt, targetShippedQuantity: -100 }` saved the -100 unchecked.
 * Only the id and the removal stamp are kept.
 */
export const asRemovalMarker = <
  L extends { id?: string | null; removedAt?: Date | null },
>(
  line: L,
): L =>
  line.removedAt ? ({ id: line.id, removedAt: line.removedAt } as L) : line;
