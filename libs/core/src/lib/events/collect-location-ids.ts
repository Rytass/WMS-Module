/** The columns of an order item that name where its stock sits or goes. */
export interface ItemLocationLike {
  readonly id?: string;
  readonly locationId?: string | null;
  /** A transfer item also names a destination; completing it writes stock there. */
  readonly targetLocationId?: string | null;
}

/**
 * Every location a change ultimately touches: the item's own and, for a
 * transfer, the one it is headed to. Both ends are checked or a transfer *into*
 * a locked location slips through. Empty for no item, and ids that are missing
 * or blank are dropped.
 */
export const collectLocationIds = (
  item: ItemLocationLike | null | undefined,
): string[] =>
  item
    ? [
        ...new Set(
          [item.locationId, item.targetLocationId].filter(
            (id): id is string => typeof id === 'string' && id.length > 0,
          ),
        ),
      ]
    : [];
