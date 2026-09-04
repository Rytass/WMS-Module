'use client';

import { useQuery } from '@apollo/client/react';
import {
  OrderReferencesDocument,
  WmsOrderType,
} from '../../graphql/generated/.graphql';

/**
 * Every upstream document one order was opened for.
 *
 * Unpaginated on purpose: an order is opened for a handful of documents, not a
 * page of them, and a truncated list here would quietly claim an order had
 * fewer reasons than it does.
 */
export function useOrderReferences(
  orderType: WmsOrderType,
  orderId: string | undefined,
) {
  const { data, loading } = useQuery(OrderReferencesDocument, {
    variables: { orderType, orderId },
    skip: !orderId,
    fetchPolicy: 'cache-and-network',
  });

  return {
    references: data?.orderReferences.items ?? [],
    loading,
  };
}
