import { resolveDisabled } from './operation-registry';

/**
 * Pure semantics of the deployment switches. The schema-level effect is covered
 * by `operation-registration.integration.spec.ts`, which needs a live app; this
 * suite only pins the allow/deny logic and the misuse guard.
 */
describe('resolveDisabled', () => {
  it('registers everything when nothing is configured', () => {
    const { hasSwitches, isOperationDisabled, disabledFields } =
      resolveDisabled({});

    expect(hasSwitches).toBe(false);
    expect(isOperationDisabled('material:create')).toBe(false);
    expect(disabledFields.size).toBe(0);
  });

  it('treats `disabledOperations` as a deny-list', () => {
    const { hasSwitches, isOperationDisabled } = resolveDisabled({
      disabledOperations: ['material:create', 'material:update'],
    });

    expect(hasSwitches).toBe(true);
    expect(isOperationDisabled('material:create')).toBe(true);
    expect(isOperationDisabled('material:update')).toBe(true);
    expect(isOperationDisabled('material:read')).toBe(false);
  });

  it('treats `enabledOperations` as an allow-list', () => {
    const { isOperationDisabled } = resolveDisabled({
      enabledOperations: ['material:read', 'stock:read'],
    });

    expect(isOperationDisabled('material:read')).toBe(false);
    expect(isOperationDisabled('stock:read')).toBe(false);
    expect(isOperationDisabled('material:create')).toBe(true);
    expect(isOperationDisabled('scrape-order:scrape')).toBe(true);
  });

  it('disables everything when the allow-list is empty', () => {
    const { hasSwitches, isOperationDisabled } = resolveDisabled({
      enabledOperations: [],
    });

    // An explicit empty allow-list means "register nothing" — it must not be
    // mistaken for "not configured".
    expect(hasSwitches).toBe(true);
    expect(isOperationDisabled('material:read')).toBe(true);
  });

  it('rejects passing both lists rather than silently preferring one', () => {
    expect(() =>
      resolveDisabled({
        enabledOperations: ['material:read'],
        disabledOperations: ['material:create'],
      }),
    ).toThrow(/mutually exclusive/);
  });

  it('carries `disabledFields` through untouched', () => {
    const { hasSwitches, disabledFields } = resolveDisabled({
      disabledFields: ['availableLoaders'],
    });

    expect(hasSwitches).toBe(true);
    expect(disabledFields.has('availableLoaders')).toBe(true);
  });
});
