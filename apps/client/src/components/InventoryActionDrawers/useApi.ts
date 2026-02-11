import { useLazyQuery } from '@apollo/client/react';

import { AggregatedStocksForInventoryActionsDocument } from '../../graphql/generated/.graphql';

export function useQueryInventoryList() {
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
