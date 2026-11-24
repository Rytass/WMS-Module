import { defaultResolveId } from './wms-operation-runner';

describe('defaultResolveId', () => {
  it('takes the id off the result', () => {
    expect(defaultResolveId({ id: 'r-1' }, { id: 'a-1' })).toBe('r-1');
  });

  it('falls back to the id argument when the result is a bare boolean', () => {
    expect(defaultResolveId(true, { id: 'a-1' })).toBe('a-1');
  });

  it('falls back when the result has a non-string id', () => {
    expect(defaultResolveId({ id: 7 }, { id: 'a-1' })).toBe('a-1');
  });

  it('falls back for null, undefined and non-object results', () => {
    expect(defaultResolveId(null, { id: 'a' })).toBe('a');
    expect(defaultResolveId(undefined, { id: 'a' })).toBe('a');
    expect(defaultResolveId('text', { id: 'a' })).toBe('a');
  });

  it('is null when neither side carries a string id', () => {
    expect(defaultResolveId({}, {})).toBeNull();
    expect(defaultResolveId({ other: 1 }, { id: 3 })).toBeNull();
  });
});
