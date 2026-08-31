// Not published: `package.json#files` ships only the emitted `.js`/`.d.ts` and
// docs, so config and spec files stay out of the tarball.
const swcOptions = {
  jsc: {
    target: 'es2022',
    parser: { syntax: 'typescript', tsx: true },
    transform: { react: { runtime: 'automatic' } },
  },
  module: { type: 'commonjs' },
};

export default {
  displayName: 'react',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.spec.ts', '<rootDir>/src/**/*.spec.tsx'],
  transform: { '^.+\\.[cm]?[tj]sx?$': ['@swc/jest', swcOptions] },
  // `@rytass/*` and `nuqs` ship ESM-syntax `.js`, so they go through the
  // transform rather than being ignored.
  transformIgnorePatterns: ['/node_modules/(?!(@rytass|nuqs)/)'],
};
