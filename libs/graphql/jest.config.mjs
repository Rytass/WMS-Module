// Not published: `package.json#files` only ships `**/*.js`, `**/*.d.ts`, README,
// LICENSE and docs — `.mjs` config files stay out of the tarball (same as
// `rollup.config.mjs`).
const swcOptions = {
  jsc: {
    target: 'es2022',
    // TypeORM/NestJS rely on class names at runtime (STI discriminators, DI
    // tokens), so they must survive minification-free transpilation.
    keepClassNames: true,
    parser: {
      syntax: 'typescript',
      decorators: true,
    },
    transform: {
      legacyDecorator: true,
      decoratorMetadata: true,
    },
  },
  module: {
    type: 'commonjs',
  },
};

export default {
  displayName: 'graphql',
  testEnvironment: 'node',
  setupFiles: ['reflect-metadata', '<rootDir>/jest.table-prefix.setup.cjs'],
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  transform: {
    '^.+\\.[cm]?[tj]s$': ['@swc/jest', swcOptions],
  },
  // `@rytass/*` packages ship ESM-syntax `.js` files without `"type": "module"`,
  // so they have to go through the transform instead of being ignored.
  transformIgnorePatterns: ['/node_modules/(?!@rytass/)'],
  moduleNameMapper: {
    // Mirrors the `tsconfig.base.json` path alias: consume the sibling lib from
    // source so a stale build artefact can never mask a regression.
    '^@rytass/wms-module-core$': '<rootDir>/../core/src/index.ts',
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
  // The integration suite boots a full Nest + TypeORM + Apollo app.
  testTimeout: 120_000,
};
