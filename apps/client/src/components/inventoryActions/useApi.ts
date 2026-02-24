import { useQuery, useLazyQuery, useMutation } from '@apollo/client/react';
import {
  StocksGroupedByMaterialDocument,
  AggregatedStocksDocument,
  AggregatedStocksForInventoryActionsDocument,
  CreateHoldInventoryOrderDocument,
} from '../../graphql/generated/.graphql';

const refetchQueriesAfterInventoryActions = [
  StocksGroupedByMaterialDocument,
  AggregatedStocksDocument,
];

export function useLazyQueryInventoryList() {
  const [fetchInventoryList, { data, loading }] = useLazyQuery(
    AggregatedStocksForInventoryActionsDocument,
    {
      fetchPolicy: 'cache-and-network',
    },
  );

  return {
    fetchInventoryList,
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

export function useHoldInventory() {
  const [holdInventory] = useMutation(CreateHoldInventoryOrderDocument, {
    refetchQueries: refetchQueriesAfterInventoryActions,
  });

  return {
    holdInventory,
  };
}
