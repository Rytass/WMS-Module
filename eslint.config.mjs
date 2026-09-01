import nx from '@nx/eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: [
      '**/dist',
      '**/out-tsc',
      // Build artifacts emitted alongside source (CJS/ESM bundles, declaration files, lib subdirs)
      'libs/core/index.cjs.js',
      'libs/core/index.js',
      'libs/core/index.d.ts',
      'libs/core/lib/**',
      'libs/core/constants/**',
      'libs/core/models/**',
      'libs/core/services/**',
      'libs/core/typings/**',
      'libs/graphql/index.cjs.js',
      'libs/graphql/index.js',
      'libs/graphql/index.d.ts',
      'libs/graphql/lib/**',
      'libs/graphql/adapters/**',
      'libs/react/index.js',
      'libs/react/index.d.ts',
      'libs/react/globals.d.ts',
      'libs/react/apollo/**',
      'libs/react/components/**',
      'libs/react/graphql/**',
      'libs/react/hooks/**',
      'libs/react/icons/**',
      'libs/react/router/**',
      'libs/react/utils/**',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            {
              sourceTag: '*',
              onlyDependOnLibsWithTags: ['*'],
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    // Override or add rules here
    rules: {},
  },
  {
    // Register react-hooks plugin so eslint-disable comments referencing its rules are valid
    plugins: { 'react-hooks': reactHooks },
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];
