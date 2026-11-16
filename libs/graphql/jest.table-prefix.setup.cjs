// Not published: package.json#files matches `**/*.js` and `**/*.d.ts`, and a
// `.cjs` file is neither.
//
// `WMS_TEST_TABLE_PREFIX=wms_ npx jest -c libs/graphql/jest.config.mjs` reruns
// the entire suite with every WMS table prefixed. That is the only way to cover
// every raw-SQL path at once: a literal table name anywhere then reads a table
// that does not exist and the spec exercising it fails.
//
// Runs once per test file, in that file's own module registry, before the spec
// imports anything — so the entity classes the prefix is applied to are the
// very ones the spec's DataSource registers. TypeORM's metadata args storage
// lives on `globalThis`, which jest also scopes per file.
//
// The require is top-level on purpose: Nx reads a require inside a block as a
// lazy import of `core` and then fails every static import of it in this lib.
const { applyWmsTablePrefix } = require('@rytass/wms-module-core');

const prefix = process.env.WMS_TEST_TABLE_PREFIX;

if (prefix) {
  applyWmsTablePrefix(prefix);
}
