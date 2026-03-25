import { useQuery } from '@apollo/client/react';
import {
  ShipInventoryOrderDocument,
  AggregatedStocksForInventoryActionsDocument,
} from '../../../graphql/generated/.graphql';

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

export function useQueryInventoryList(ids: string[]) {
  const { data, loading } = useQuery(
    AggregatedStocksForInventoryActionsDocument,
    {
      variables: {
        ids,
      },
      skip: ids.length === 0,
      fetchPolicy: 'cache-and-network',
    },
  );

  return {
    data,
    loading,
  };
}
