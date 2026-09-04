import { WmsModuleCoreModule } from '@rytass/wms-module-core';

/**
 * The guards on `customChangeTables`, which all fire while the module is being
 * defined rather than at the first insert.
 *
 * A registration mistake here is not the kind that shows up as an exception
 * somewhere useful: shadowing a built-in table would silently reclassify every
 * receipt in the warehouse, and a table that misses the `_order_changes` suffix
 * would get events while quietly escaping the inventory count lock. Both look
 * exactly like working software until someone reads a report. A startup crash
 * is the cheapest possible version of that news.
 */
const baseOptions = {
  useFactory: async () => ({}),
  defaultLoaderSerialId: 'DEFAULT',
  defaultLoaderTypeKey: 'DEFAULT',
  defaultLocationKey: 'DEFAULT',
};

const register = (
  tables: { table: string; changeType: () => string | null }[],
): unknown =>
  WmsModuleCoreModule.forRootAsync({
    ...baseOptions,
    customChangeTables: tables,
  } as never);

describe('customChangeTables registration', () => {
  it('accepts a table this package does not own', () => {
    expect(() =>
      register([
        { table: 'tenant_rework_order_changes', changeType: () => 'REWORKING' },
      ]),
    ).not.toThrow();
  });

  it('accepts no registration at all', () => {
    expect(() =>
      WmsModuleCoreModule.forRootAsync(baseOptions as never),
    ).not.toThrow();
  });

  it('refuses to shadow one of our own change tables', () => {
    expect(() =>
      register([
        {
          table: 'receive_inventory_order_changes',
          changeType: () => 'ANYTHING',
        },
      ]),
    ).toThrow(/this package owns it/);
  });

  it('refuses the consumption order table too', () => {
    expect(() =>
      register([
        { table: 'consumption_order_changes', changeType: () => 'ANYTHING' },
      ]),
    ).toThrow(/this package owns it/);
  });

  it('refuses the same table twice', () => {
    expect(() =>
      register([
        { table: 'tenant_rework_order_changes', changeType: () => 'A' },
        { table: 'tenant_rework_order_changes', changeType: () => 'B' },
      ]),
    ).toThrow(/twice/);
  });

  it('refuses a name the inventory count lock would not recognise', () => {
    expect(() =>
      register([{ table: 'tenant_rework_log', changeType: () => 'REWORKING' }]),
    ).toThrow(/_order_changes/);
  });
});
