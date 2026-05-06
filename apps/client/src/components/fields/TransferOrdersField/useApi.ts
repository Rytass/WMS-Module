import { useLazyQuery } from '@apollo/client/react';
import { TransferOrderOptionsDocument } from '../../../graphql/generated/.graphql';

export function useLazyQueryTransferOrderOptions() {
  const [fetchTransferOrderOptions] = useLazyQuery(
    TransferOrderOptionsDocument,
    {
      fetchPolicy: 'cache-and-network',
    },
  );

  return {
    fetchTransferOrderOptions,
  };
}
