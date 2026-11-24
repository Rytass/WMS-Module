import { collectLocationIds } from './collect-location-ids';

describe('collectLocationIds', () => {
  it('is empty without an item', () => {
    expect(collectLocationIds(null)).toEqual([]);
    expect(collectLocationIds(undefined)).toEqual([]);
  });

  it('returns the item location and the transfer target, both', () => {
    expect(
      collectLocationIds({ locationId: 'a', targetLocationId: 'b' }),
    ).toEqual(['a', 'b']);
  });

  it('returns the target alone when the item has no location', () => {
    expect(collectLocationIds({ targetLocationId: 'b' })).toEqual(['b']);
  });

  it('collapses a transfer within one location to a single id', () => {
    expect(
      collectLocationIds({ locationId: 'a', targetLocationId: 'a' }),
    ).toEqual(['a']);
  });

  it('drops null, undefined and blank ids', () => {
    expect(
      collectLocationIds({ locationId: null, targetLocationId: '' }),
    ).toEqual([]);
    expect(collectLocationIds({})).toEqual([]);
  });
});
