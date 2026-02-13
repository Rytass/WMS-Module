import { useLazyQuery } from '@apollo/client/react';
import { BatchOptionsDocument } from '../../../graphql/generated/.graphql';

export function useLazyQueryBatches() {
  const [fetchBatches] = useLazyQuery(BatchOptionsDocument);

  return {
    fetchBatches,
  };
}
