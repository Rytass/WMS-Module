export interface PositionLike {
  readonly materialId: string;
  readonly batchId: string;
  readonly locationId: string | null;
  readonly loaderId: string | null;
}

/**
 * The identity of one stock position on a count sheet: material, batch,
 * location and loader. A missing location or loader is the empty string, so
 * "no loader" is its own position, distinct from any real one.
 */
export const positionKey = (position: PositionLike): string =>
  [
    position.materialId,
    position.batchId,
    position.locationId ?? '',
    position.loaderId ?? '',
  ].join('|');
