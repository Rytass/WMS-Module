import { ShipChangeKind } from '../constants/ship-change-kind';
import { absQuantity, sumQuantities } from './quantity';

/** What a ship order item's change rows add up to, in base units. */
export interface ShipChangeQuantities {
  /** Set aside for shipment. */
  readonly reserved: number;
  /** Left the warehouse. */
  readonly shipped: number;
  /** Reservation undone; the stock went back to its batch. */
  readonly cancelled: number;
}

/**
 * Sum change rows by their `kind`, never by sign: a ship and a cancel are both
 * negative. A row without a kind (written before the column existed) counts
 * for nothing until the upgrade SQL has filled it in.
 */
export const sumShipChanges = (
  changes: readonly {
    readonly kind?: ShipChangeKind | null;
    readonly quantityChanged: number | string;
  }[],
): ShipChangeQuantities => {
  const total = (kind: ShipChangeKind): number =>
    sumQuantities(
      changes
        .filter((change) => change.kind === kind)
        .map((change) => absQuantity(change.quantityChanged)),
    );

  return {
    reserved: total(ShipChangeKind.RESERVE),
    shipped: total(ShipChangeKind.SHIP),
    cancelled: total(ShipChangeKind.CANCEL),
  };
};
