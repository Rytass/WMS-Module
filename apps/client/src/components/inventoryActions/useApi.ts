import { useCallback } from 'react';
import { Message } from '@mezzanine-ui/react';
import { useQuery, useLazyQuery, useMutation } from '@apollo/client/react';
import {
  AggregatedStockFragment,
  StocksGroupedByMaterialDocument,
  AggregatedStocksDocument,
  AggregatedStocksForInventoryActionsDocument,
  CreateHoldInventoryOrderDocument,
} from '../../graphql/generated/.graphql';
import { isEnableActionStatus } from './utils';
import { useInventoryActions } from './useInventoryActions';

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

export function useHoldInventory(inventoryList: AggregatedStockFragment[]) {
  const { targetAction, inventorySignature, resetAll } = useInventoryActions();
  const [holdInventory] = useMutation(CreateHoldInventoryOrderDocument, {
    refetchQueries: refetchQueriesAfterInventoryActions,
  });

  const onSubmit = useCallback(async () => {
    try {
      const { data } = await holdInventory({
        variables: {
          items: inventoryList
            .filter((item) =>
              isEnableActionStatus(item.status, targetAction?.status),
            )
            .map((item) => inventorySignature[item.id])
            .map((s) => ({
              aggregatedKey: s.id,
              unitId: s.unitId,
              targetHeldQuantity: s.quantity,
            })),
        },
      });

      if (data?.createHoldInventoryOrder.id) {
        Message.success(`${targetAction?.submitText}成功`);
        resetAll();
      }
    } catch (error) {
      console.error(error);
    }
  }, [
    holdInventory,
    inventoryList,
    inventorySignature,
    resetAll,
    targetAction?.status,
    targetAction?.submitText,
  ]);

  return {
    onSubmit,
  };
}
