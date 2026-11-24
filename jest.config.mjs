// Root jest config, used for one thing: the *merged* coverage report across
// `libs/core` (unit) and `libs/graphql` (integration).
//
// It cannot be `projects: [...]`. Jest matches `collectCoverageFrom` against
// paths relative to each *project's* rootDir, so from `libs/graphql` the sibling
// `../core/**` matches nothing and core silently drops out of the report (the
// report reads "0/0"). A single config whose rootDir is the repo root sees both.
//
// Day to day, use `nx test core` / `nx test graphql`; CI and `yarn test:coverage`
// use this one. Mirrors the two lib configs: keep them in step.
import { swcOptions } from './tools/jest-swc-options.mjs';

export default {
  displayName: 'wms',
  rootDir: '.',
  testEnvironment: 'node',
  setupFiles: [
    'reflect-metadata',
    '<rootDir>/libs/graphql/jest.table-prefix.setup.cjs',
  ],
  testMatch: [
    '<rootDir>/libs/core/src/**/*.spec.ts',
    '<rootDir>/libs/graphql/src/**/*.spec.ts',
  ],
  transform: { '^.+\\.[cm]?[tj]s$': ['@swc/jest', swcOptions] },
  transformIgnorePatterns: ['/node_modules/(?!@rytass/)'],
  moduleNameMapper: {
    '^@rytass/wms-module-core$': '<rootDir>/libs/core/src/index.ts',
    '^@rytass/wms-base-nestjs-module$':
      '<rootDir>/node_modules/@rytass/wms-base-nestjs-module/index.js',
    '^@rytass/wms-base-nestjs-module/(.+?)(\\.js)?$':
      '<rootDir>/node_modules/@rytass/wms-base-nestjs-module/$1.js',
  },
  testTimeout: 120_000,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['json', 'text-summary'],
  collectCoverageFrom: [
    'libs/core/src/**/*.ts',
    'libs/graphql/src/**/*.ts',
    '!**/*.spec.ts',
    '!**/index.ts',
    '!**/testing/**',
    '!**/*.d.ts',
  ],
};
