import Decimal from 'decimal.js';

/**
 * Exact decimal arithmetic for stock quantities (#227).
 *
 * Quantity columns are `numeric`, but JavaScript sums and compares them as
 * binary floats: `0.1 * 3 !== 0.3`, and `0.1 + 0.2 + 0.3` is `0.6000000000000001`
 * in one order and `0.6` in another, so a valid shipment was refused and a
 * whole-loader transfer passed or failed by the order of its items.
 *
 * **Every quantity sum, difference, product, quotient and comparison goes
 * through this file; services never use `+ - * /` or `< > ===` on a quantity
 * and never import `decimal.js` themselves.** Inputs may be a number or the
 * string a `numeric` column comes back as (raw query results and the base
 * module's stock rows are strings at runtime), so callers need no `Number()`.
 *
 * Results are returned as numbers (the public type of every quantity field).
 * A number built from a decimal result is the nearest double, which prints and
 * re-reads as the same decimal for anything up to 15 significant digits.
 */
export type QuantityInput = number | string;

// A private constructor: `Decimal.set` would reconfigure every other user of
// decimal.js in the process.
const Dec = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -40,
  toExpPos: 40,
});

const toDec = (value: QuantityInput): Decimal => new Dec(value);

/** A quantity as a number, the way every entity field is typed. */
export const toQuantityNumber = (value: QuantityInput): number =>
  toDec(value).toNumber();

/** `a + b`. */
export const addQuantity = (a: QuantityInput, b: QuantityInput): number =>
  toDec(a).plus(toDec(b)).toNumber();

/** `a - b`. */
export const subtractQuantity = (a: QuantityInput, b: QuantityInput): number =>
  toDec(a).minus(toDec(b)).toNumber();

/** Exact sum, independent of the order of `values`; `0` for none. */
export const sumQuantities = (values: readonly QuantityInput[]): number =>
  values
    .reduce<Decimal>((sum, value) => sum.plus(toDec(value)), new Dec(0))
    .toNumber();

/** `-value`, without the `-0` a float multiplication by `-1` leaves behind. */
export const negateQuantity = (value: QuantityInput): number => {
  const negated = toDec(value).negated();

  return negated.isZero() ? 0 : negated.toNumber();
};

/** `|value|`. */
export const absQuantity = (value: QuantityInput): number =>
  toDec(value).abs().toNumber();

/** `-1 | 0 | 1`, comparing as decimals. `NaN` compares as `NaN` (assert before). */
export const compareQuantity = (a: QuantityInput, b: QuantityInput): number =>
  toDec(a).comparedTo(toDec(b));

/** `a === b` as decimals (`'0.50'` equals `0.5`). */
export const quantitiesEqual = (a: QuantityInput, b: QuantityInput): boolean =>
  toDec(a).equals(toDec(b));

export const isZeroQuantity = (value: QuantityInput): boolean =>
  toDec(value).isZero();

/** Strictly greater than zero. */
export const isPositiveQuantity = (value: QuantityInput): boolean =>
  toDec(value).greaterThan(0);

/** Strictly less than zero. */
export const isNegativeQuantity = (value: QuantityInput): boolean =>
  toDec(value).lessThan(0);

/** The smaller of two quantities. */
export const minQuantity = (a: QuantityInput, b: QuantityInput): number =>
  Dec.min(toDec(a), toDec(b)).toNumber();

/** A quantity in the line's own unit, in base units: `quantity * conversionFactor`. */
export const toBaseQuantity = (
  quantity: QuantityInput,
  conversionFactor: QuantityInput,
): number => toDec(quantity).times(toDec(conversionFactor)).toNumber();

/**
 * A quantity in base units, in the line's own unit: `base / conversionFactor`.
 * A zero factor is a configuration error, not a quantity of `Infinity`.
 */
export const fromBaseQuantity = (
  base: QuantityInput,
  conversionFactor: QuantityInput,
): number => {
  const factor = toDec(conversionFactor);

  if (factor.isZero()) {
    throw new RangeError('conversionFactor must not be 0');
  }

  return toDec(base).dividedBy(factor).toNumber();
};
