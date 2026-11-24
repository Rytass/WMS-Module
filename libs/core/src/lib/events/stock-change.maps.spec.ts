import { ChangeType } from '../constants/stock-status';
import {
  CHANGE_TYPE_TO_EVENT,
  OWNED_CHANGE_TABLES,
  TABLE_TO_CHANGE_TYPE,
} from './stock-change.subscriber';

describe('stock change classification tables', () => {
  it('names an event for every ChangeType (no member left without one)', () => {
    Object.values(ChangeType).forEach((type) => {
      expect(CHANGE_TYPE_TO_EVENT[type]).toMatch(/^stock\./);
    });
  });

  it('has no event for a value that is not a ChangeType', () => {
    expect(Object.keys(CHANGE_TYPE_TO_EVENT).sort()).toEqual(
      Object.values(ChangeType).map(String).sort(),
    );
  });

  it('gives every event a distinct name', () => {
    const names = Object.values(CHANGE_TYPE_TO_EVENT);

    expect(new Set(names).size).toBe(names.length);
  });

  it('only resolves a table to a ChangeType the event table knows', () => {
    TABLE_TO_CHANGE_TYPE.forEach((resolve, table) => {
      [-1, 1].forEach((sign) => {
        const type = resolve({
          id: 'o',
          itemId: 'i',
          quantityChanged: sign,
          kind: null,
        });

        if (type !== null) {
          expect(CHANGE_TYPE_TO_EVENT[type]).toBeDefined();
        }
      });

      expect(table.endsWith('_order_changes')).toBe(true);
    });
  });

  it('uses the sign of quantityChanged for directional tables, number or numeric string', () => {
    const ship = TABLE_TO_CHANGE_TYPE.get('ship_inventory_order_changes');

    expect(ship?.({ id: 'o', itemId: 'i', quantityChanged: '2.5' })).toBe(
      ChangeType.IN_SHIPMENT,
    );
    expect(ship?.({ id: 'o', itemId: 'i', quantityChanged: -2.5 })).toBe(
      ChangeType.SHIPPED,
    );
  });

  it('separates consumption return and settlement by kind, not sign', () => {
    const consumption = TABLE_TO_CHANGE_TYPE.get('consumption_order_changes');
    const row = { id: 'o', itemId: 'i', quantityChanged: -1 };

    expect(consumption?.({ ...row, kind: 'ISSUE' as never })).toBe(
      ChangeType.ISSUED,
    );
    expect(consumption?.({ ...row, kind: 'RETURN' as never })).toBe(
      ChangeType.RETURNED,
    );
    expect(consumption?.({ ...row, kind: 'SETTLE' as never })).toBe(
      ChangeType.CONSUMED,
    );
  });

  it('classifies a consumption row without a kind as nothing rather than guessing', () => {
    const consumption = TABLE_TO_CHANGE_TYPE.get('consumption_order_changes');

    expect(
      consumption?.({ id: 'o', itemId: 'i', quantityChanged: 1 }),
    ).toBeNull();
  });

  it('classifies the fixed-type tables regardless of sign', () => {
    const fixed: ReadonlyArray<readonly [string, ChangeType]> = [
      ['receive_inventory_order_changes', ChangeType.RECEIVED],
      ['split_batch_order_changes', ChangeType.SPLITTED],
      ['merge_batch_order_changes', ChangeType.MERGED],
      ['reclassify_inventory_order_changes', ChangeType.RECLASSIFIED],
      ['scrape_order_changes', ChangeType.SCRAPED],
    ];

    fixed.forEach(([table, expected]) => {
      const resolve = TABLE_TO_CHANGE_TYPE.get(table);

      expect(resolve?.({ id: 'o', itemId: 'i', quantityChanged: 1 })).toBe(
        expected,
      );
      expect(resolve?.({ id: 'o', itemId: 'i', quantityChanged: -1 })).toBe(
        expected,
      );
    });
  });

  it('derives the owned tables from the map plus quality inspection', () => {
    TABLE_TO_CHANGE_TYPE.forEach((_, table) => {
      expect(OWNED_CHANGE_TABLES.has(table)).toBe(true);
    });
    expect(OWNED_CHANGE_TABLES.has('quality_inspection_order_changes')).toBe(
      true,
    );
    expect(OWNED_CHANGE_TABLES.size).toBe(TABLE_TO_CHANGE_TYPE.size + 1);
  });
});
