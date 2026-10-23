/**
 * What a `consumption_order_changes` row records.
 *
 * The three actions cannot be told apart by the sign of `quantityChanged`
 * alone, which is how every other change table in this package encodes
 * direction: a return and a settlement are both negative, and the difference
 * between "it came back to the shelf" and "it is gone" is the entire point of
 * the order. So the intent is stored rather than inferred.
 */
export enum ConsumptionChangeKind {
  /** Material left the shelf for the consuming location. */
  ISSUE = 'ISSUE',
  /** Material came back from the consuming location, unused. */
  RETURN = 'RETURN',
  /** Material at the consuming location was used up and left inventory. */
  SETTLE = 'SETTLE',
}
