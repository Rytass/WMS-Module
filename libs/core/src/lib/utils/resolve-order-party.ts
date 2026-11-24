import { BadRequestException } from '@nestjs/common';

/**
 * The customer or vendor a line added to an existing transfer order is for.
 *
 * The order row has no such column: it lives on each line, and the line's
 * batch is split under it. So a line added by an update takes the value the
 * caller names, or failing that the one the existing lines carry. Naming a
 * different one than the lines already carry would put two parties on one
 * order after stock has moved for the first, so that is refused. `null`
 * means neither side names one; the caller refuses only if it has a line to
 * add.
 */
export const resolveOrderParty = (
  field: string,
  requested: string | null | undefined,
  existing: readonly (string | null | undefined)[],
  orderId: string,
): string | null => {
  const current = existing.find((value): value is string => !!value) ?? null;

  if (requested && current && requested !== current) {
    throw new BadRequestException(
      `Order ${orderId} already moved stock for ${field} ${current} and cannot switch to ${requested}`,
    );
  }

  return requested || current;
};
