import { useQuery } from '@apollo/client/react';
import { AvailableLoadersDocument } from '../../../graphql/generated/.graphql';

export function useQueryAvailableLoaders(locationId?: string) {
  const { data, loading } = useQuery(AvailableLoadersDocument, {
    variables: {
      locationId,
    },
    fetchPolicy: 'cache-and-network',
  });

  return {
    data,
    loading,
  };
}
