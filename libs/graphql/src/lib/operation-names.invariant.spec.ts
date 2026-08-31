import { readdirSync, readFileSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { WMS_OPERATION_NAMES } from '@rytass/wms-module-core';

/**
 * Two drift guards around the operation-name vocabulary.
 *
 * 1. `WMS_OPERATION_NAMES` must list exactly the requirements `@WmsOperation`
 *    declares. A new resolver that forgets to add its name would otherwise ship
 *    an operation a consumer cannot switch off — and the switch would fail
 *    silently, because an unknown name in `disabledOperations` matches nothing.
 *
 * 2. Every `operation` in `@rytass/wms-module-react`'s
 *    `INVENTORY_ACTION_OPERATIONS` must be a real backend operation name. That
 *    table is what lets a host derive its frontend and backend switches from one
 *    constant; a typo there means the two ends drift apart without anyone
 *    noticing.
 *
 * Both are source scans on purpose. Importing the resolver classes would build
 * the whole Nest metadata graph, and `libs/react` is browser/ESM-only so it
 * cannot be imported from a node test at all.
 */

const GRAPHQL_SRC = resolve(__dirname, '..');
const REACT_OPERATIONS_FILE = resolve(
  __dirname,
  '../../../react/src/components/inventoryActions/operations.ts',
);

function collectTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);

    if (statSync(path).isDirectory()) {
      return collectTypeScriptFiles(path);
    }

    return path.endsWith('.ts') && !path.endsWith('.spec.ts') ? [path] : [];
  });
}

/** Every `${resource}:${action}` a `@WmsOperation` declares, deduplicated. */
function declaredOperationNames(): Set<string> {
  const pattern =
    /@WmsOperation\(\{\s*resource:\s*'([^']+)',\s*action:\s*'([^']+)'/g;
  const names = new Set<string>();

  for (const file of collectTypeScriptFiles(GRAPHQL_SRC)) {
    const source = readFileSync(file, 'utf8');
    let match = pattern.exec(source);

    while (match) {
      names.add(`${match[1]}:${match[2]}`);
      match = pattern.exec(source);
    }
  }

  return names;
}

describe('operation-name vocabulary', () => {
  it('lists exactly the requirements declared by @WmsOperation', () => {
    const declared = [...declaredOperationNames()].sort();
    const published = [...(WMS_OPERATION_NAMES as readonly string[])].sort();

    // Reported as two diffs so a failure says which direction drifted.
    expect(declared.filter((name) => !published.includes(name))).toEqual([]);
    expect(published.filter((name) => !declared.includes(name))).toEqual([]);
  });

  it('keeps WMS_OPERATION_NAMES free of duplicates', () => {
    expect(new Set(WMS_OPERATION_NAMES).size).toBe(WMS_OPERATION_NAMES.length);
  });

  it("only maps react's inventory actions onto real operation names", () => {
    const source = readFileSync(REACT_OPERATIONS_FILE, 'utf8');
    const pattern = /operation:\s*'([^']+)'/g;
    const mapped: string[] = [];
    let match = pattern.exec(source);

    while (match) {
      mapped.push(match[1]);
      match = pattern.exec(source);
    }

    // The 15 write actions the inventory-action layer can send.
    expect(mapped).toHaveLength(15);
    expect(
      mapped.filter(
        (name) => !(WMS_OPERATION_NAMES as readonly string[]).includes(name),
      ),
    ).toEqual([]);
  });
});
