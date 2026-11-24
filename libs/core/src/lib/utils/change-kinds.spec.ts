import { ShipChangeKind } from '../constants/ship-change-kind';
import { TransferChangeKind } from '../constants/transfer-change-kind';
import { assertChangesHaveKind } from './assert-change-kinds';
import { sumShipChanges } from './ship-change-quantities';
import { sumTransferChanges } from './transfer-change-quantities';

describe('assertChangesHaveKind', () => {
  it('accepts an item whose rows all carry a kind, or no rows at all', () => {
    expect(() => assertChangesHaveKind('i', [])).not.toThrow();
    expect(() =>
      assertChangesHaveKind('i', [{ kind: ShipChangeKind.RESERVE }]),
    ).not.toThrow();
  });

  it.each([null, undefined])('refuses a row whose kind is %p', (kind) => {
    expect(() =>
      assertChangesHaveKind('item-1', [
        { kind: ShipChangeKind.SHIP },
        { kind },
      ]),
    ).toThrow(/Item item-1 has change rows without a kind.*§4\.8/);
  });
});

describe('sumShipChanges', () => {
  it('sums each kind by magnitude, number or numeric string', () => {
    expect(
      sumShipChanges([
        { kind: ShipChangeKind.RESERVE, quantityChanged: '5' },
        { kind: ShipChangeKind.RESERVE, quantityChanged: 1 },
        { kind: ShipChangeKind.SHIP, quantityChanged: -2 },
        { kind: ShipChangeKind.CANCEL, quantityChanged: '-1.5' },
      ]),
    ).toEqual({ reserved: 6, shipped: 2, cancelled: 1.5 });
  });

  it('counts a row without a kind for nothing', () => {
    expect(
      sumShipChanges([
        { kind: null, quantityChanged: -4 },
        { quantityChanged: 3 },
      ]),
    ).toEqual({ reserved: 0, shipped: 0, cancelled: 0 });
  });
});

describe('sumTransferChanges', () => {
  it('sums each kind by magnitude, number or numeric string', () => {
    expect(
      sumTransferChanges([
        { kind: TransferChangeKind.RESERVE, quantityChanged: 4 },
        { kind: TransferChangeKind.TRANSFER, quantityChanged: '-3' },
        { kind: TransferChangeKind.CANCEL, quantityChanged: -1 },
      ]),
    ).toEqual({ reserved: 4, transferred: 3, cancelled: 1 });
  });

  it('counts a row without a kind for nothing', () => {
    expect(sumTransferChanges([{ kind: null, quantityChanged: -4 }])).toEqual({
      reserved: 0,
      transferred: 0,
      cancelled: 0,
    });
  });
});
