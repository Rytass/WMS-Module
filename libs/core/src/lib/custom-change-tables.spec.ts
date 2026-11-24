import { assertCustomChangeTables } from './custom-change-tables';
import { OWNED_CHANGE_TABLES } from './events/stock-change.subscriber';
import type { WmsCustomChangeTable } from './typings/custom-change-table';

const table = (name: string): WmsCustomChangeTable => ({
  table: name,
  changeType: () => null,
});

describe('assertCustomChangeTables', () => {
  it('returns an empty list for undefined and for an empty list', () => {
    expect(assertCustomChangeTables(undefined)).toEqual([]);
    expect(assertCustomChangeTables([])).toEqual([]);
  });

  it('accepts distinct tables ending in _order_changes and returns them', () => {
    const tables = [table('pick_order_changes'), table('pack_order_changes')];

    expect(assertCustomChangeTables(tables)).toBe(tables);
  });

  it('refuses a table this package owns, whichever one it is', () => {
    expect(OWNED_CHANGE_TABLES.size).toBeGreaterThan(0);

    OWNED_CHANGE_TABLES.forEach((owned) => {
      expect(() => assertCustomChangeTables([table(owned)])).toThrow(
        /this package owns it/,
      );
    });
  });

  it('refuses the same table twice', () => {
    expect(() =>
      assertCustomChangeTables([
        table('pick_order_changes'),
        table('pick_order_changes'),
      ]),
    ).toThrow(/twice/);
  });

  it('refuses a name without the _order_changes suffix (it would escape the count lock)', () => {
    expect(() => assertCustomChangeTables([table('pick_changes')])).toThrow(
      /_order_changes/,
    );
  });
});
