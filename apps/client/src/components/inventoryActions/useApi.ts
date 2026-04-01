import { useMemo, useCallback } from 'react';
import { flatten, groupBy } from 'lodash';
import { Message } from '@mezzanine-ui/react';
import { useQuery, useLazyQuery, useMutation } from '@apollo/client/react';
import {
  AggregatedStockFragment,
  StocksGroupedByMaterialDocument,
  AggregatedStocksDocument,
  AggregatedStocksForInventoryActionsDocument,
  CreateTransferOrderDocument,
  CreateHoldInventoryOrderDocument,
  ReleaseDocument,
  CreateAllocateInventoryOrderDocument,
  DeallocateDocument,
  SplitBatchDocument,
  MergeBatchDocument,
  ReclassifyInventoryOrderDocument,
  CreateTransferVendorOrderDocument,
  CreateTransferCustomerOrderDocument,
  ScrapeMaterialsDocument,
} from '../../graphql/generated/.graphql';
import { formatAvailableInventoryList, getSaleInformation } from './utils';
import { CreateTransferInventoryFieldValues } from './fields/CreateTransferInventoryField/typing';
import { AllocateInventoryFieldValues } from './fields/AllocateInventoryField/typing';
import { ShipInventoryFieldValues } from './fields/ShipInventoryField/typing';
import { SplitBatchFieldValues } from './fields/SplitBatchField/typing';
import { MergeBatchFieldValues } from './fields/MergeBatchField/typing';
import { ReclassifyInventoryFieldValues } from './fields/ReclassifyInventoryField/typing';
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

export function useCreateTransferInventory(
  inventoryList: AggregatedStockFragment[],
) {
  const { targetAction, inventorySignature, resetAll } = useInventoryActions();
  const [createTransferInventory] = useMutation(CreateTransferOrderDocument, {
    refetchQueries: refetchQueriesAfterInventoryActions,
  });

  const onSubmit = useCallback(
    async (values: CreateTransferInventoryFieldValues) => {
      try {
        const { data } = await createTransferInventory({
          variables: {
            locationId: values.location?.id ?? '',
            loaderId: values.loader?.id,
            receiver: values.receiver || '',
            description: values.description || '',
            items: formatAvailableInventoryList({
              inventoryList,
              targetAction,
              inventorySignature,
            }).map((s) => ({
              aggregatedKey: s.id,
              unitId: s.unitId,
              targetTransferredQuantity: s.quantity,
            })),
          },
        });

        if (data?.createTransferOrder.id) {
          Message.success(`${targetAction?.submitText}成功`);
          resetAll();
        }
      } catch (error) {
        console.error(error);
      }
    },
    [
      createTransferInventory,
      inventoryList,
      inventorySignature,
      resetAll,
      targetAction,
    ],
  );

  return {
    onSubmit,
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

export function useAllocateInventory(inventoryList: AggregatedStockFragment[]) {
  const { targetAction, inventorySignature, resetAll } = useInventoryActions();
  const [allocateInventory] = useMutation(
    CreateAllocateInventoryOrderDocument,
    {
      refetchQueries: refetchQueriesAfterInventoryActions,
    },
  );

  const onSubmit = useCallback(
    async (values: AllocateInventoryFieldValues) => {
      try {
        const { data } = await allocateInventory({
          variables: {
            items: formatAvailableInventoryList({
              inventoryList,
              targetAction,
              inventorySignature,
            }).map((s) => ({
              aggregatedKey: s.id,
              unitId: s.unitId,
              targetAllocatedQuantity: s.quantity,
              saleId: values.saleId?.id ?? '',
              saleSerialId: values.saleSerialId?.id ?? '',
            })),
          },
        });

        if (data?.createAllocateInventoryOrder.id) {
          Message.success(`${targetAction?.submitText}成功`);
          resetAll();
        }
      } catch (error) {
        console.error(error);
      }
    },
    [
      allocateInventory,
      inventoryList,
      inventorySignature,
      resetAll,
      targetAction,
    ],
  );

  return {
    onSubmit,
  };
}

export function useDeallocateInventory(
  inventoryList: AggregatedStockFragment[],
) {
  const { targetAction, inventorySignature, resetAll } = useInventoryActions();
  const [deallocateInventory] = useMutation(DeallocateDocument, {
    refetchQueries: refetchQueriesAfterInventoryActions,
  });

  const onSubmit = useCallback(async () => {
    try {
      const { data } = await deallocateInventory({
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

      if (data?.deallocate) {
        Message.success(`${targetAction?.submitText}成功`);
        resetAll();
      }
    } catch (error) {
      console.error(error);
    }
  }, [
    deallocateInventory,
    inventoryList,
    inventorySignature,
    resetAll,
    targetAction,
  ]);

  return {
    onSubmit,
  };
}

export function useShipInventory(inventoryList: AggregatedStockFragment[]) {
  const onSubmit = useCallback(
    async (values: ShipInventoryFieldValues) => {
      try {
        const targetItems = flatten(Object.values(values.items));
        const grouped = groupBy(targetItems, 'inventoryId');
        const validation = inventoryList.every((inventory) => {
          const groupedSignature = grouped[inventory.id];
          const targetQuantity = groupedSignature.reduce((prev, curr) => {
            const conversionFactor = curr.unitId
              ? (inventory.material.materialUnits.find(
                  (mu) => mu.id === curr.unitId,
                )?.conversionFactor ?? 1)
              : 1;

            return prev + curr.quantity * conversionFactor;
          }, 0);

          if (inventory.quantity < targetQuantity) {
            Message.error(`料號：${inventory.material.key} / 批號：${inventory.batch.key}${inventory.saleId ? ` / 銷售單號：${getSaleInformation({ saleId: inventory.saleId, saleSerialId: inventory.saleSerialId })}` : ''}
庫存不足。`);
          }

          return inventory.quantity >= targetQuantity;
        });

        if (validation) {
          console.log('targetItems', targetItems);
        }
      } catch (error) {
        console.error(error);
      }
    },
    [inventoryList],
  );

  return {
    onSubmit,
  };
}

export function useSplitBatch(inventory?: AggregatedStockFragment) {
  const { inventorySignature, targetAction, resetAll } = useInventoryActions();
  const [splitBatch] = useMutation(SplitBatchDocument, {
    refetchQueries: refetchQueriesAfterInventoryActions,
  });

  const currentSignature = useMemo(
    () => (inventory ? inventorySignature[inventory.id] : null),
    [inventory, inventorySignature],
  );

  const currentUnitId = useMemo(() => {
    return currentSignature?.unitId ?? null;
  }, [currentSignature?.unitId]);

  const onSubmit = useCallback(
    async ({ items }: SplitBatchFieldValues) => {
      try {
        const { data } = await splitBatch({
          variables: {
            aggregatedKey: inventory?.id ?? '',
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

export function useReclassifyInventory(
  inventoryList: AggregatedStockFragment[],
) {
  const { targetAction, inventorySignature, resetAll } = useInventoryActions();
  const [reclassifyInventory] = useMutation(ReclassifyInventoryOrderDocument, {
    refetchQueries: refetchQueriesAfterInventoryActions,
  });

  const onSubmit = useCallback(
    async (values: ReclassifyInventoryFieldValues) => {
      try {
        const { data } = await reclassifyInventory({
          variables: {
            materialKey: values.material?.name ?? '',
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

        if (data?.reclassifyInventoryOrder.id) {
          Message.success(`${targetAction?.submitText}成功`);
          resetAll();
        }
      } catch (error) {
        console.error(error);
      }
    },
    [
      inventoryList,
      inventorySignature,
      reclassifyInventory,
      resetAll,
      targetAction,
    ],
  );

  return {
    onSubmit,
  };
}

export function useScrapInventory(inventoryList: AggregatedStockFragment[]) {
  const { targetAction, inventorySignature, resetAll } = useInventoryActions();
  const [scrapInventory] = useMutation(ScrapeMaterialsDocument, {
    refetchQueries: refetchQueriesAfterInventoryActions,
  });

  const onSubmit = useCallback(async () => {
    try {
      const { data } = await scrapInventory({
        variables: {
          items: formatAvailableInventoryList({
            inventoryList,
            targetAction,
            inventorySignature,
          }).map((s) => ({
            aggregateKey: s.id,
            unitId: s.unitId,
            quantity: s.quantity,
          })),
        },
      });

      if (data?.scrapeMaterials.id) {
        Message.success(`${targetAction?.submitText}成功`);
        resetAll();
      }
    } catch (error) {
      console.error(error);
    }
  }, [
    inventoryList,
    inventorySignature,
    resetAll,
    scrapInventory,
    targetAction,
  ]);

  return {
    onSubmit,
  };
}
