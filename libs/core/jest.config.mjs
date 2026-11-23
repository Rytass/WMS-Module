// Unit tests for core: pure functions, no database. Integration tests live in
// libs/graphql (they need the GraphQL module). Not published: `.mjs` config
// files stay out of the tarball, like `rollup.config.mjs`.
import { swcOptions } from '../../tools/jest-swc-options.mjs';

export default {
  displayName: 'core',
  testEnvironment: 'node',
  setupFiles: ['reflect-metadata'],
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  transform: {
    '^.+\\.[cm]?[tj]s$': ['@swc/jest', swcOptions],
  },
  // `@rytass/*` packages ship ESM-syntax `.js` files without `"type": "module"`,
  // so they have to go through the transform instead of being ignored.
  transformIgnorePatterns: ['/node_modules/(?!@rytass/)'],
  moduleNameMapper: {
    // Force the per-module ESM tree. The CJS entry is a single rollup bundle, so
    // mixing it with deep `@rytass/wms-base-nestjs-module/models/*` imports would
    // yield two distinct copies of every entity class and corrupt TypeORM's
    // metadata.
    '^@rytass/wms-base-nestjs-module$':
      '<rootDir>/../../node_modules/@rytass/wms-base-nestjs-module/index.js',
    // Deep imports too (`…/models/warehouse-map.entity`, which the index does
    // not re-export): resolved through `exports` they land on the `.cjs` copy,
    // a second `WarehouseMapEntity` class next to the ESM one the base module
    // registers -- invisible until something keys off class identity, as
    // `withWmsTablePrefix` does. Only a test-runner artefact: under plain
    // CommonJS both specifiers reach the same `.cjs` file.
    '^@rytass/wms-base-nestjs-module/(.+?)(\\.js)?$':
      '<rootDir>/../../node_modules/@rytass/wms-base-nestjs-module/$1.js',
  },
  // Unit specs only: no database, no Nest application.
  testTimeout: 10_000,
};
