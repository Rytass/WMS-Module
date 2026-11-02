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
];
