import type { ValueTransformer } from 'typeorm';
import { toQuantityNumber } from '../utils/quantity';

/**
 * Reads a `numeric` column back as the `number` the entity declares.
 *
 * node-postgres returns `numeric` as a string, so a field typed `number`
 * silently held `'0.1'`: `+` concatenated it and `===` against a number was
 * never true (#227). The conversion is the nearest double, exact for up to 15
 * significant digits; it makes the *type* honest, it does not make arithmetic
 * safe. Sums and comparisons still go through `utils/quantity`, and anything
 * read with `getRawMany()` (aggregates, `SUM(...)`) is still a string.
 *
 * Writes pass through untouched: the driver serialises a number with
 * `String(n)`, which is the shortest decimal that round-trips.
 */
export const numericColumnTransformer: ValueTransformer = {
  to: (value: unknown): unknown => value,
  from: (value: string | number | null | undefined): number | null =>
    value === null || value === undefined ? null : toQuantityNumber(value),
};
