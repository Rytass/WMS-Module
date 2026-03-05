import { useLazyQuery } from '@apollo/client/react';
import { MaterialDocument } from '../../../../graphql/generated/.graphql';

export function useLazyQueryMaterial() {
  const [fetchMaterial, { data, loading }] = useLazyQuery(MaterialDocument, {
    fetchPolicy: 'cache-and-network',
  });

  return {
    data,
    loading,
    fetchMaterial,
  };
}
