/**
 * What a `ship_inventory_order_changes` row records.
 *
 * Ship and cancel both write a negative `quantityChanged`, so the sign cannot
 * say whether goods left the warehouse or the reservation was undone. The
 * intent is stored rather than inferred -- see {@link ConsumptionChangeKind}
 * for the same problem on the consumption order.
 */
export enum ShipChangeKind {
  /** Stock was set aside for shipment (positive). */
  RESERVE = 'RESERVE',
  /** Reserved stock left the warehouse (negative). */
  SHIP = 'SHIP',
  /** A reservation was undone and the stock went back to its batch (negative). */
  CANCEL = 'CANCEL',
}
