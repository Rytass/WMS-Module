import { useLazyQuery } from '@apollo/client/react';
import { LoaderOptionsDocument } from '../../../graphql/generated/.graphql';

export function useLazyQueryLoaders() {
  const [fetchLoaders] = useLazyQuery(LoaderOptionsDocument);

  return {
    fetchLoaders,
  };
}
