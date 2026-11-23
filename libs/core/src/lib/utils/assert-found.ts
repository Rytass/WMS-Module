import { NotFoundException } from '@nestjs/common';

/**
 * Refuse a call that names an id the database does not have.
 *
 * A caller that resends a report or sends a bad id used to get `true` back and
 * nothing written, so the books and the floor drifted apart without a trace
 * (#224). Call it right after the lookup, before the first write, so the whole
 * call fails and the surrounding transaction rolls back.
 */
export const assertAllFound = (
  requestedIds: readonly string[],
  found: readonly { readonly id: string }[],
  label: string,
): void => {
  const known = new Set(found.map(({ id }) => id));
  const missing = [...new Set(requestedIds)].filter((id) => !known.has(id));

  if (missing.length > 0) {
    throw new NotFoundException(`${label} ${missing.join(', ')} not found`);
  }
};

/** The row a caller's key names, or a `NotFoundException` that says which key. */
export const assertKeyFound = <T>(
  row: T | null | undefined,
  label: string,
  key: string,
): T => {
  if (!row) throw new NotFoundException(`${label} "${key}" not found`);

  return row;
};
