import { useLazyQuery } from '@apollo/client/react';
import { ShipInventoryOrderOptionsDocument } from '../../../graphql/generated/.graphql';

export function useLazyQueryShipInventoryOrders() {
  const [fetchShipInventoryOrders] = useLazyQuery(
    ShipInventoryOrderOptionsDocument,
  );

  return {
    fetchShipInventoryOrders,
  };
}
