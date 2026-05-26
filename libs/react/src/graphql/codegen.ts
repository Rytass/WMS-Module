import { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: 'schema.gql',
  documents: [
    'libs/react/src/graphql/**/*.gql',
    'libs/react/src/graphql/*.gql',
  ],
  ignoreNoDocuments: true,
  generates: {
    'libs/react/src/graphql/generated/.graphql.ts': {
      plugins: ['typescript', 'typescript-operations', 'typed-document-node'],
    },
  },
  config: {
    namingConvention: {
      enumValues: 'change-case-all#upperCase',
    },
  },
};

export default config;
