import { useLazyQuery } from '@apollo/client/react';
import {
  ReceiveInventoryOrderOptionsDocument,
  ReceiveInventoryOrderPendingOptionsDocument,
} from '../../../graphql/generated/.graphql';

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

export function useLazyQueryReceiveInventoryOrderPendingOptions() {
  const [fetchReceiveInventoryOrderPendingOptions] = useLazyQuery(
    ReceiveInventoryOrderPendingOptionsDocument,
    {
      fetchPolicy: 'cache-and-network',
    },
  );

  return {
    fetchReceiveInventoryOrderPendingOptions,
  };
}
