import { useLazyQuery } from '@apollo/client/react';
import { LoaderTypeOptionsDocument } from '../../../graphql/generated/.graphql';

export function useLazyQueryLoaderTypes() {
  const [fetchLoaderTypes] = useLazyQuery(LoaderTypeOptionsDocument);

  return {
    fetchLoaderTypes,
  };
}
