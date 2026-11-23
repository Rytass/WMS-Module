import { BadRequestException } from '@nestjs/common';

/**
 * Refuse a quantity a caller handed in that is not a finite number above zero.
 *
 * Every write path computes its stock rows from the quantity's sign, so a
 * negative or `NaN` value does not fail on its own: `ship({ quantity: -5 })`
 * raised the on-hand total, `receive({ quantity: -5 })` took a batch below
 * zero (#221). Call it on the arguments of a *public* entry point only. The
 * shared `process*Items` helpers and the `release` / `deallocate` / `return*`
 * paths write negative targets on purpose and must not be guarded here.
 *
 * `field` names the offending argument and `context` where it sits (an item id,
 * a line index), so the message points at one value in a batch of many.
 */
export const assertPositiveQuantity = (
  value: unknown,
  field: string,
  context?: string,
): void => {
  const quantity = typeof value === 'number' ? value : Number(value);

  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(quantity) ||
    quantity <= 0
  ) {
    throw new BadRequestException(
      `${field} must be a number greater than 0 (got ${String(value)}${context ? `, ${context}` : ''})`,
    );
  }
};

/** `assertPositiveQuantity` for an optional field: absent is allowed, present must be positive. */
export const assertPositiveQuantityIfPresent = (
  value: unknown,
  field: string,
  context?: string,
): void => {
  if (value === undefined) return;

  assertPositiveQuantity(value, field, context);
};
