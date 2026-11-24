import { TransferChangeKind } from '../constants/transfer-change-kind';
import { absQuantity, sumQuantities } from './quantity';

/** What a transfer order item's change rows add up to, in base units. */
export interface TransferChangeQuantities {
  /** Set aside for the transfer. */
  readonly reserved: number;
  /** Moved to the destination. */
  readonly transferred: number;
  /** Reservation undone; the stock went back to its source. */
  readonly cancelled: number;
}

/**
 * Sum change rows by their `kind`, never by sign: an execution and a
 * cancellation are both negative. A row without a kind (written before the
 * column existed) counts for nothing until the upgrade SQL has filled it in.
 */
export const sumTransferChanges = (
  changes: readonly {
    readonly kind?: TransferChangeKind | null;
    readonly quantityChanged: number | string;
  }[],
): TransferChangeQuantities => {
  const total = (kind: TransferChangeKind): number =>
    sumQuantities(
      changes
        .filter((change) => change.kind === kind)
        .map((change) => absQuantity(change.quantityChanged)),
    );

  return {
    reserved: total(TransferChangeKind.RESERVE),
    transferred: total(TransferChangeKind.TRANSFER),
    cancelled: total(TransferChangeKind.CANCEL),
  };
};
