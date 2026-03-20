import { useCallback } from 'react';
import { Message } from '@mezzanine-ui/react';
import { useQuery, useLazyQuery, useMutation } from '@apollo/client/react';
import {
  AggregatedStockFragment,
  StocksGroupedByMaterialDocument,
  AggregatedStocksDocument,
  AggregatedStocksForInventoryActionsDocument,
  CreateHoldInventoryOrderDocument,
  ReleaseDocument,
  SplitBatchDocument,
  MergeBatchDocument,
} from '../../graphql/generated/.graphql';
import { formatAvailableInventoryList } from './utils';
import { SplitBatchFieldValues } from './fields/SplitBatchField/typing';
import { MergeBatchFieldValues } from './fields/MergeBatchField/typing';
import {
  useInventoryActions,
  useInventorySignature,
} from './useInventoryActions';

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
          items: formatAvailableInventoryList({
            inventoryList,
            targetAction,
            inventorySignature,
          }).map((s) => ({
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
    targetAction,
  ]);

  return {
    onSubmit,
  };
}

export function useReleaseHoldInventory(
  inventoryList: AggregatedStockFragment[],
) {
  const { targetAction, inventorySignature, resetAll } = useInventoryActions();
  const [releaseHoldInventory] = useMutation(ReleaseDocument, {
    refetchQueries: refetchQueriesAfterInventoryActions,
  });

  const onSubmit = useCallback(async () => {
    try {
      const { data } = await releaseHoldInventory({
        variables: {
          items: formatAvailableInventoryList({
            inventoryList,
            targetAction,
            inventorySignature,
          }).map((s) => ({
            aggregatedKey: s.id,
            unitId: s.unitId,
            quantity: s.quantity,
          })),
        },
      });

      if (data?.release) {
        Message.success(`${targetAction?.submitText}成功`);
        resetAll();
      }
    } catch (error) {
      console.error(error);
    }
  }, [
    inventoryList,
    inventorySignature,
    releaseHoldInventory,
    resetAll,
    targetAction,
  ]);

  return {
    onSubmit,
  };
}

export function useSplitBatch(inventory: AggregatedStockFragment) {
  const { targetAction, resetAll } = useInventoryActions();
  const { currentUnitId } = useInventorySignature(inventory);
  const [splitBatch] = useMutation(SplitBatchDocument, {
    refetchQueries: refetchQueriesAfterInventoryActions,
  });

  const onSubmit = useCallback(
    async ({ items }: SplitBatchFieldValues) => {
      try {
        const { data } = await splitBatch({
          variables: {
            aggregatedKey: inventory.id,
            unitId: currentUnitId,
            items,
          },
        });

        if (data?.splitBatch.id) {
          Message.success(`${targetAction?.submitText}成功`);
          resetAll();
        }
      } catch (error) {
        console.error(error);
      }
    },
    [currentUnitId, inventory, resetAll, splitBatch, targetAction?.submitText],
  );

  return {
    onSubmit,
  };
}

export function useMergeBatch(inventoryList: AggregatedStockFragment[]) {
  const { targetAction, inventorySignature, resetAll } = useInventoryActions();
  const [mergeBatch] = useMutation(MergeBatchDocument, {
    refetchQueries: refetchQueriesAfterInventoryActions,
  });

  const onSubmit = useCallback(
    async ({ newKey }: MergeBatchFieldValues) => {
      try {
        const { data } = await mergeBatch({
          variables: {
            batchKey: newKey,
            materialId: inventoryList[0].material.id,
            items: formatAvailableInventoryList({
              inventoryList,
              targetAction,
              inventorySignature,
            }).map((s) => ({
              aggregatedKey: s.id,
              quantity: s.quantity,
            })),
          },
        });

        if (data?.mergeBatch.id) {
          Message.success(`${targetAction?.submitText}成功`);
          resetAll();
        }
      } catch (error) {
        console.error(error);
      }
    },
    [inventoryList, inventorySignature, mergeBatch, resetAll, targetAction],
  );

  return {
    onSubmit,
  };
}
