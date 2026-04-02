import { useLazyQuery } from '@apollo/client/react';
import { ShipInventoryOrderDocument } from '../../../../graphql/generated/.graphql';

export function useLazyQueryShipInventoryOrder() {
  const [fetchShipInventoryOrder, { data, loading }] = useLazyQuery(
    ShipInventoryOrderDocument,
    {
      fetchPolicy: 'cache-and-network',
    },
  );

  return {
    data,
    loading,
    fetchShipInventoryOrder,
  };
}
