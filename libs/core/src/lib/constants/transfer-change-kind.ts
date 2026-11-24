/**
 * What a `transfer_order_changes` row records.
 *
 * Executing a transfer and cancelling it both write a negative
 * `quantityChanged`, so the sign cannot say whether stock arrived at its
 * destination or went back to the source. The intent is stored rather than
 * inferred -- see {@link ShipChangeKind} for the same problem on the ship order.
 */
export enum TransferChangeKind {
  /** Stock was set aside for the transfer (positive). */
  RESERVE = 'RESERVE',
  /** Reserved stock was moved to its destination (negative). */
  TRANSFER = 'TRANSFER',
  /** A reservation was undone and the stock went back to its source (negative). */
  CANCEL = 'CANCEL',
}
