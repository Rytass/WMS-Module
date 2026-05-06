import { useLazyQuery } from '@apollo/client/react';
import { ReceiveInventoryOrderOptionsDocument } from '../../../graphql/generated/.graphql';

export function useLazyQueryReceiveInventoryOrderOptions() {
  const [fetchReceiveInventoryOrderOptions] = useLazyQuery(
    ReceiveInventoryOrderOptionsDocument,
    {
      fetchPolicy: 'cache-and-network',
    },
  );

  return {
    fetchReceiveInventoryOrderOptions,
  };
}
