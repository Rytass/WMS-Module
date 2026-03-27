import { useLazyQuery } from '@apollo/client/react';
import {
  ShipInventoryOrderOptionsDocument,
  ShipInventoryOrderPendingOptionsDocument,
} from '../../../graphql/generated/.graphql';

export function useLazyQueryShipInventoryOrderOptions() {
  const [fetchShipInventoryOrderOptions] = useLazyQuery(
    ShipInventoryOrderOptionsDocument,
  );

  return {
    fetchShipInventoryOrderOptions,
  };
}

export function useLazyQueryShipInventoryOrderPendingOptions() {
  const [fetchShipInventoryOrderPendingOptions] = useLazyQuery(
    ShipInventoryOrderPendingOptionsDocument,
  );

  return {
    fetchShipInventoryOrderPendingOptions,
  };
}
