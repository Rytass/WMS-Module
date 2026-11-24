import { BadRequestException } from '@nestjs/common';

/**
 * Refuse an update that names an existing line with anything but its id.
 *
 * On allocate, hold and customer/vendor transfer orders a line moves stock
 * the moment it is created: its batch is split and its change row written.
 * Stamping `removedAt` on it, or rewriting its quantity, batch or location,
 * would leave that stock where it is and the document disagreeing with the
 * ledger. The reversal is its own operation (`reversal`), which records its
 * own movement. A line carrying only its `id` is a no-op and passes.
 */
export const assertLineNotEdited = (
  line: Readonly<Record<string, unknown>> & { readonly id?: unknown },
  orderLabel: string,
  reversal: string,
): void => {
  const fields = Object.keys(line).filter(
    (key) => key !== 'id' && line[key] !== undefined,
  );

  if (!fields.length) {
    return;
  }

  const verb = fields.includes('removedAt') ? 'removed' : 'changed';

  throw new BadRequestException(
    `${orderLabel} item ${String(line.id)} has already moved stock and cannot be ${verb} (${fields.join(', ')}); use ${reversal} instead`,
  );
};
