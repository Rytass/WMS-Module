import typescript from '@rollup/plugin-typescript';
import { builtinModules } from 'node:module';

const externalPatterns = [
  /^@nestjs\//,
  /^@rytass\//,
  /^@apollo\//,
  'typeorm',
  'rxjs',
  /^rxjs\//,
  'reflect-metadata',
  'graphql',
  'dataloader',
  'lodash',
  /^lodash\//,
  'lru-cache',
  'luxon',
  'tslib',
  ...builtinModules,
  ...builtinModules.map((mod) => `node:${mod}`),
];

const isExternal = (id) =>
  externalPatterns.some((pattern) =>
    typeof pattern === 'string' ? id === pattern : pattern.test(id),
  );

export default [
  {
    input: 'src/index.ts',
    output: {
      file: 'index.cjs.js',
      format: 'cjs',
      exports: 'named',
      interop: 'auto',
    },
    external: isExternal,
    plugins: [
      typescript({
        tsconfig: './tsconfig.lib.json',
        declaration: false,
        outDir: '.',
        compilerOptions: {
          module: 'esnext',
        },
      }),
    ],
  },
  // The two adapters need a CommonJS build of their own. They are separate
  // entry points, and a NestJS host is usually CommonJS — without this the
  // `require` condition below has nothing to point at, and
  // `require('@rytass/wms-module-graphql/adapters/member-base')` fails with
  // ERR_PACKAGE_PATH_NOT_EXPORTED. Both adapters are thin: everything they
  // import beyond types is external, so these bundles duplicate nothing.
  {
    input: {
      'adapters/member-base': 'src/adapters/member-base.ts',
      'adapters/event-emitter': 'src/adapters/event-emitter.ts',
    },
    output: {
      dir: '.',
      format: 'cjs',
      exports: 'named',
      interop: 'auto',
      entryFileNames: '[name].cjs.js',
      chunkFileNames: '[name]-[hash].cjs.js',
    },
    external: isExternal,
    plugins: [
      typescript({
        tsconfig: './tsconfig.lib.json',
        declaration: false,
        outDir: '.',
        compilerOptions: {
          module: 'esnext',
        },
      }),
    ],
  },
];
