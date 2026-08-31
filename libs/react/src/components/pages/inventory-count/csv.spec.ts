import { buildCountSheetCsv, parseCountSheetCsv } from './csv';

/**
 * The count sheet's file format.
 *
 * This is the one piece of the counting UI with real logic rather than
 * rendering: a floor operator prints the sheet, writes on it, retypes it and
 * uploads it back, so the parser has to survive an id column that was mangled in
 * Excel, rows in a different order, and a bad value in the middle of two hundred
 * good ones.
 */
type Item = Parameters<typeof buildCountSheetCsv>[1][number];

const item = (overrides: Partial<Item> & { id: string }): Item =>
  ({
    orderId: 'order-1',
    materialId: 'm1',
    batchId: 'b1',
    locationId: 'l1',
    loaderId: null,
    unitId: null,
    bookQuantity: 100,
    countedQuantity: null,
    isAddition: false,
    material: { key: 'WATER2B003', description: '200ml 礦泉水' },
    batch: { key: '2510310042' },
    location: { key: 'A1-01' },
    loader: null,
    ...overrides,
  }) as unknown as Item;

const items = [
  item({ id: 'item-1' }),
  item({
    id: 'item-2',
    batch: { key: '2510310099' },
  } as Partial<Item> & { id: string }),
];

describe('count sheet CSV', () => {
  it('writes a BOM so Excel reads the Chinese headers', () => {
    expect(buildCountSheetCsv('IC-1', items).startsWith('﻿')).toBe(true);
  });

  it('leaves the counted-quantity column blank for the floor to fill in', () => {
    const [, firstRow] = buildCountSheetCsv('IC-1', items).split('\r\n');

    expect(firstRow.endsWith(',')).toBe(true);
    expect(firstRow).toContain('item-1');
    expect(firstRow).toContain('WATER2B003');
  });

  it('round-trips through the item id', () => {
    const csv = buildCountSheetCsv('IC-1', items)
      .replace('item-1,WATER2B003', 'item-1,WATER2B003')
      .split('\r\n')
      .map((line, index) => (index === 1 ? `${line}94` : line))
      .join('\r\n');

    const { rows, errors } = parseCountSheetCsv(csv, items);

    expect(errors).toEqual([]);
    expect(rows).toEqual([{ itemId: 'item-1', countedQuantity: 94 }]);
  });

  it('falls back to the natural key when the id column was mangled', () => {
    const csv = [
      '盤點單號,項目識別碼,料號,物料說明,批號,儲存位置,載具,帳面數量,單位,盤點數量',
      'IC-1,,WATER2B003,200ml 礦泉水,2510310042,A1-01,,100,,88',
    ].join('\r\n');

    const { rows, errors } = parseCountSheetCsv(csv, items);

    expect(errors).toEqual([]);
    expect(rows).toEqual([{ itemId: 'item-1', countedQuantity: 88 }]);
  });

  it('treats a blank count as "not counted yet", not as zero', () => {
    const csv = ['項目識別碼,盤點數量', 'item-1,', 'item-2,5'].join('\r\n');

    const { rows, errors } = parseCountSheetCsv(csv, items);

    expect(errors).toEqual([]);
    expect(rows).toEqual([{ itemId: 'item-2', countedQuantity: 5 }]);
  });

  it('collects every bad row instead of failing on the first', () => {
    const csv = [
      '項目識別碼,盤點數量',
      'item-1,abc',
      'nope,5',
      'item-2,7',
      'item-2,9',
    ].join('\r\n');

    const { rows, errors } = parseCountSheetCsv(csv, items);

    // The one good row still lands; the three problems are reported together so
    // the operator can fix the file in one pass.
    expect(rows).toEqual([{ itemId: 'item-2', countedQuantity: 7 }]);
    expect(errors).toHaveLength(3);
    expect(errors[0]).toContain('第 2 列');
    expect(errors[2]).toContain('重複');
  });

  it('rejects a file without the counted-quantity column', () => {
    const { rows, errors } = parseCountSheetCsv('料號\nWATER2B003', items);

    expect(rows).toEqual([]);
    expect(errors).toEqual(['找不到「盤點數量」欄位']);
  });

  it('handles quoted cells containing commas', () => {
    const csv = [
      '項目識別碼,物料說明,盤點數量',
      'item-1,"200ml, 礦泉水",42',
    ].join('\r\n');

    const { rows, errors } = parseCountSheetCsv(csv, items);

    expect(errors).toEqual([]);
    expect(rows).toEqual([{ itemId: 'item-1', countedQuantity: 42 }]);
  });
});
