import { useLazyQuery } from '@apollo/client/react';
import { MapDataDocument } from '../../graphql/generated/.graphql';

export function useLazyQueryMapData() {
  const [fetchMapData, { data, loading }] = useLazyQuery(MapDataDocument, {
    fetchPolicy: 'cache-and-network',
  });

  return {
    fetchMapData,
    data,
    loading,
  };
}
