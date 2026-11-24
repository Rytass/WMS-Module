import type { DataSource } from 'typeorm';
import { quotedTablePathOf, tablePathOf } from './table-path';

const dataSourceWith = (tablePath: string): DataSource =>
  ({ getMetadata: () => ({ tablePath }) }) as unknown as DataSource;

describe('tablePathOf', () => {
  it('returns the table path TypeORM resolved, prefix included', () => {
    expect(tablePathOf(dataSourceWith('wms_stocks'), 'x')).toBe('wms_stocks');
  });

  it('keeps the schema part', () => {
    expect(tablePathOf(dataSourceWith('wms.stocks'), 'x')).toBe('wms.stocks');
  });
});

describe('quotedTablePathOf', () => {
  it('double-quotes a bare table name', () => {
    expect(quotedTablePathOf(dataSourceWith('stocks'), 'x')).toBe('"stocks"');
  });

  it('quotes schema and table separately', () => {
    expect(quotedTablePathOf(dataSourceWith('wms.stocks'), 'x')).toBe(
      '"wms"."stocks"',
    );
  });

  it('escapes embedded double quotes by doubling them', () => {
    expect(quotedTablePathOf(dataSourceWith('a"b.c'), 'x')).toBe('"a""b"."c"');
  });
});
