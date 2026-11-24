import { ShipChangeKind } from '../constants/ship-change-kind';
import { TransferChangeKind } from '../constants/transfer-change-kind';
import { sumShipChanges } from './ship-change-quantities';
import { sumTransferChanges } from './transfer-change-quantities';
import { numericColumnTransformer } from '../models/numeric-column.transformer';

describe('change quantity sums (#227)', () => {
  it('sums ship changes by kind without float drift, whatever the row type', () => {
    const changes = [
      { kind: ShipChangeKind.RESERVE, quantityChanged: '0.1' },
      { kind: ShipChangeKind.RESERVE, quantityChanged: 0.2 },
      { kind: ShipChangeKind.RESERVE, quantityChanged: '0.3' },
      { kind: ShipChangeKind.SHIP, quantityChanged: -0.1 },
      { kind: ShipChangeKind.SHIP, quantityChanged: '-0.2' },
      { kind: ShipChangeKind.CANCEL, quantityChanged: -0.3 },
      { kind: null, quantityChanged: 99 },
    ];

    expect(sumShipChanges(changes)).toEqual({
      reserved: 0.6,
      shipped: 0.3,
      cancelled: 0.3,
    });
    expect(sumShipChanges([...changes].reverse())).toEqual(
      sumShipChanges(changes),
    );
  });

  it('sums transfer changes by kind without float drift', () => {
    expect(
      sumTransferChanges([
        { kind: TransferChangeKind.RESERVE, quantityChanged: 0.1 },
        { kind: TransferChangeKind.RESERVE, quantityChanged: 0.2 },
        { kind: TransferChangeKind.TRANSFER, quantityChanged: -0.3 },
      ]),
    ).toEqual({ reserved: 0.3, transferred: 0.3, cancelled: 0 });
  });
});

describe('numericColumnTransformer', () => {
  it('reads a numeric string as a number and keeps null', () => {
    expect(numericColumnTransformer.from('0.30')).toBe(0.3);
    expect(numericColumnTransformer.from(null)).toBeNull();
    expect(numericColumnTransformer.from(undefined)).toBeNull();
  });

  it('writes the value as it is', () => {
    expect(numericColumnTransformer.to(0.1)).toBe(0.1);
    expect(numericColumnTransformer.to(null)).toBeNull();
  });
});
