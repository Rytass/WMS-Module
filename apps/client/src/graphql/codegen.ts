import { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: 'schema.gql',
  documents: [
    'apps/client/src/graphql/**/*.gql',
    'apps/client/src/graphql/*.gql',
  ],
  ignoreNoDocuments: true,
  generates: {
    'apps/client/src/graphql/generated/.graphql.ts': {
      plugins: [
        'typescript',
        'typescript-operations',
        'typescript-react-apollo',
      ],
    },
  },
  config: {
    namingConvention: {
      enumValues: 'change-case-all#upperCase',
    },
  },
};

export default config;
