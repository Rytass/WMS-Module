import { useLazyQuery } from '@apollo/client/react';
import { LocationOptionsDocument } from '../../../graphql/generated/.graphql';

export function useLazyQueryLocations() {
  const [fetchLocations] = useLazyQuery(LocationOptionsDocument);

  return {
    fetchLocations,
  };
}
