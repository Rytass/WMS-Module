import { useQuery } from '@apollo/client/react';
import { ShipInventoryOrderDocument } from '../../../graphql/generated/.graphql';

export function useQueryShipInventoryOrder(id: string) {
  const { data, loading } = useQuery(ShipInventoryOrderDocument, {
    variables: {
      shipInventoryOrderId: id,
    },
    fetchPolicy: 'cache-and-network',
  });

  return {
    data,
    loading,
  };
}
