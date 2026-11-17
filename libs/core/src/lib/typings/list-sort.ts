/**
 * Direction of a list sort. Exposed through GraphQL as the `SortOrder` enum.
 */
export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

/**
 * One sort criterion a caller asks a list for. `F` is that list's own
 * `<List>SortField` enum, so a field that list does not whitelist is a type
 * error — and, for a caller that bypasses the types, a runtime error from
 * `applyListSort`.
 */
export interface ListSort<F extends string> {
  field: F;
  order: SortOrder;
}
