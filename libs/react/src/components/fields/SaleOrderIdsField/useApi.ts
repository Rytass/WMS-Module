import { useLazyQuery } from '@apollo/client/react';
import { SaleOrderDistinctIdsDocument } from '../../../graphql/generated/.graphql';

export function useLazyQuerySaleOrderIds() {
  const [fetchSaleOrderIds] = useLazyQuery(SaleOrderDistinctIdsDocument);

  return {
    fetchSaleOrderIds,
  };
}
