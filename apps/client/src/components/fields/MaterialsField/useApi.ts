import { useLazyQuery } from '@apollo/client/react';

import { MaterialOptionsDocument } from '../../../graphql/generated/.graphql';

export function useFetchMaterials() {
  const [fetchMaterials] = useLazyQuery(MaterialOptionsDocument);

  return {
    fetchMaterials,
  };
}
