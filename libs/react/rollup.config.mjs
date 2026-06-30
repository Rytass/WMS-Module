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

// Rollup strips module-level 'use client' / 'use server' directives (and emits
// a MODULE_LEVEL_DIRECTIVE warning). React Server Components consumers need the
// directive to survive in the emitted files so the client boundary is honoured.
// This tiny plugin records which source modules carried the directive and
// re-prepends it to exactly those chunks — avoiding a global output banner that
// would wrongly stamp server-capable modules (e.g. apollo/, nextpath, codegen).
const preserveUseClientDirective = () => {
  const clientModules = new Set();

  return {
    name: 'preserve-use-client-directive',
    transform(code, id) {
      if (/^\s*(['"])use client\1/.test(code)) {
        clientModules.add(id);
      }

      return null;
    },
    renderChunk(code, chunk) {
      if (chunk.facadeModuleId && clientModules.has(chunk.facadeModuleId)) {
        return { code: `'use client';\n${code}`, map: null };
      }

      return null;
    },
  };
};

// @rytass/wms-module-react is ESM-only because key React-side deps in
// the WMS stack (e.g. nuqs, @apollo/client/react helpers) ship as pure
// ESM packages. Modern bundlers (Next.js, Vite, webpack 5) consume ESM
// natively, so dropping a CJS bundle keeps the lib compatible with
// downstream ESM-only deps without forcing consumers to wrestle with
// CommonJS interop.
//
// Three entrypoints are emitted:
//   - index            → the component/hook barrel
//   - router/pages     → Pages Router bridge (imports next/router)
//   - router/app       → App Router bridge (imports next/navigation)
// The two bridges are intentionally NOT imported by the barrel (a single
// module cannot statically import both next/router and next/navigation), so
// each needs its own input to be emitted. Shared router/{context,
// WmsRouterProvider} modules are emitted once and reused across entrypoints.
export default [
  {
    input: {
      index: 'src/index.ts',
      'router/pages': 'src/router/pages.tsx',
      'router/app': 'src/router/app.tsx',
    },
    output: {
      dir: '.',
      format: 'esm',
      preserveModules: true,
      preserveModulesRoot: 'src',
      entryFileNames: '[name].js',
    },
    external: isExternal,
    onwarn(warning, warn) {
      // 'use client' directives are preserved on purpose (see plugin above).
      if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
      warn(warning);
    },
    plugins: [
      typescript({
        tsconfig: './tsconfig.lib.json',
        declaration: true,
        declarationDir: '.',
        rootDir: './src',
        outDir: '.',
        jsx: 'react-jsx',
      }),
      preserveUseClientDirective(),
    ],
  },
];
