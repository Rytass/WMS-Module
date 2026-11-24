import { BadRequestException } from '@nestjs/common';

/**
 * Refuse a unit conversion factor that is not a finite number above zero.
 *
 * Every quantity in a non-base unit is multiplied by its factor on the way to
 * the ledger, so `0` zeroes a movement, a negative value flips its sign and
 * `NaN` / `Infinity` poison the sums — none of them fail on their own. Guards
 * every write of `material_units.conversionFactor` and the read in
 * `MaterialService.getConversionFactor` (the column is unconstrained `numeric`,
 * which accepts `NaN` and `Infinity` too).
 */
export const assertPositiveConversionFactor = (
  value: unknown,
  unit: string,
): number => {
  const factor =
    typeof value === 'number' || typeof value === 'string'
      ? Number(value)
      : Number.NaN;

  if (value === '' || !Number.isFinite(factor) || factor <= 0) {
    throw new BadRequestException(
      `conversionFactor of unit ${unit} must be a finite number greater than 0 (got ${String(value)})`,
    );
  }

  return factor;
};
