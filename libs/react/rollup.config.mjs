import typescript from '@rollup/plugin-typescript';
import { builtinModules } from 'node:module';

const externalPatterns = [
  /^@apollo\//,
  /^@hookform\//,
  /^@mezzanine-ui\//,
  /^@rytass\//,
  'axios',
  'graphql',
  /^graphql\//,
  'lodash',
  /^lodash\//,
  'luxon',
  /^luxon\//,
  /^next\//,
  'next',
  'nuqs',
  /^nuqs\//,
  'react',
  'react-dom',
  /^react-dom\//,
  'react-hook-form',
  'tslib',
  'yup',
  ...builtinModules,
  ...builtinModules.map((mod) => `node:${mod}`),
];

const isScssImport = (id) => /\.scss(\?.*)?$/.test(id) || /\.css(\?.*)?$/.test(id);

const isExternal = (id) => {
  if (isScssImport(id)) return true;
  return externalPatterns.some((pattern) =>
    typeof pattern === 'string' ? id === pattern : pattern.test(id),
  );
};

// @rytass/wms-module-react is ESM-only because key React-side deps in
// the WMS stack (e.g. nuqs, @apollo/client/react helpers) ship as pure
// ESM packages. Modern bundlers (Next.js, Vite, webpack 5) consume ESM
// natively, so dropping a CJS bundle keeps the lib compatible with
// downstream ESM-only deps without forcing consumers to wrestle with
// CommonJS interop.
export default [
  {
    input: 'src/index.ts',
    output: {
      dir: '.',
      format: 'esm',
      preserveModules: true,
      preserveModulesRoot: 'src',
      entryFileNames: '[name].js',
    },
    external: isExternal,
    plugins: [
      typescript({
        tsconfig: './tsconfig.lib.json',
        declaration: true,
        declarationDir: '.',
        rootDir: './src',
        outDir: '.',
        jsx: 'react-jsx',
      }),
    ],
  },
];
