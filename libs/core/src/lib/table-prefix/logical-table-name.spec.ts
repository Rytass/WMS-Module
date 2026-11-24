import {
  getWmsTablePrefix,
  wmsLogicalTableName,
  writeWmsTablePrefixState,
  readWmsTablePrefixState,
} from './logical-table-name';

describe('table prefix state', () => {
  const before = readWmsTablePrefixState();

  afterEach(() => {
    // The state is process-global (`Symbol.for` on globalThis): put it back so
    // nothing else in this worker sees a prefix it did not ask for.
    if (before) {
      writeWmsTablePrefixState(before);
    } else {
      (globalThis as Record<symbol, unknown>)[
        Symbol.for('@rytass/wms-module-core/table-prefix')
      ] = undefined;
    }
  });

  it('has no prefix and passes every name through when nothing was applied', () => {
    (globalThis as Record<symbol, unknown>)[
      Symbol.for('@rytass/wms-module-core/table-prefix')
    ] = undefined;

    expect(getWmsTablePrefix()).toBe('');
    expect(wmsLogicalTableName('stocks')).toBe('stocks');
  });

  it('reports the prefix in effect', () => {
    writeWmsTablePrefixState({ prefix: 'wms_', logicalNames: new Map() });

    expect(getWmsTablePrefix()).toBe('wms_');
  });

  it('maps a prefixed table back to the name it was declared with', () => {
    writeWmsTablePrefixState({
      prefix: 'wms_',
      logicalNames: new Map([
        ['wms_transfer_order_changes', 'transfer_order_changes'],
      ]),
    });

    expect(wmsLogicalTableName('wms_transfer_order_changes')).toBe(
      'transfer_order_changes',
    );
  });

  it('returns a table it did not prefix as it is (a host table that merely looks like ours)', () => {
    writeWmsTablePrefixState({
      prefix: 'wms_',
      logicalNames: new Map([['wms_stocks', 'stocks']]),
    });

    expect(wmsLogicalTableName('transfer_order_changes')).toBe(
      'transfer_order_changes',
    );
  });
});
