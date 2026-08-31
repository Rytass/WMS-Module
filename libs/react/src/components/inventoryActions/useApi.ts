import { useMemo, useCallback } from 'react';
import { flatten, groupBy } from 'lodash';
import { Message } from '@mezzanine-ui/react';
import { useQuery, useLazyQuery, useMutation } from '@apollo/client/react';
import {
  StockInActionsFragment,
  StocksGroupedByMaterialDocument,
  AggregatedStocksDocument,
  AggregatedStocksForInventoryActionsDocument,
  AvailableLoadersDocument,
  CreateTransferOrderDocument,
  CreateHoldInventoryOrderDocument,
  ReleaseDocument,
  CreateAllocateInventoryOrderDocument,
  DeallocateDocument,
  UpdateShipInventoryOrderDocument,
  SplitBatchDocument,
  MergeBatchDocument,
  ReclassifyInventoryOrderDocument,
  CreateTransferVendorOrderDocument,
  ReturnTransferVendorOrderDocument,
  InspectMaterialsDocument,
  CreateTransferCustomerOrderDocument,
  ReturnTransferCustomerOrderDocument,
  ScrapeMaterialsDocument,
} from '../../graphql/generated/.graphql';
import { formatAvailableInventoryList, getSaleInformation } from './utils';
import { CreateTransferInventoryFieldValues } from './fields/CreateTransferInventoryField/typing';
import { AllocateInventoryFieldValues } from './fields/AllocateInventoryField/typing';
import { ShipInventoryFieldValues } from './fields/ShipInventoryField/typing';
import { SplitBatchFieldValues } from './fields/SplitBatchField/typing';
import { MergeBatchFieldValues } from './fields/MergeBatchField/typing';
import { ReclassifyInventoryFieldValues } from './fields/ReclassifyInventoryField/typing';
import { TransferToVendorFieldValues } from './fields/TransferToVendorField/typing';
import { ReturnFromVendorFieldValues } from './fields/ReturnFromVendorField/typing';
import { QualityInspectionFieldValues } from './fields/QualityInspectionField/typing';
import { DeliverToCustomerFieldValues } from './fields/DeliverToCustomerField/typing';
import { ReturnFromCustomerFieldValues } from './fields/ReturnFromCustomerField/typing';
import { useInventoryActions } from './useInventoryActions';
import { useInventoryActionError } from './useInventoryActionError';

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

export function useQueryAvailableLoaders(locationId?: string) {
  const { data, loading } = useQuery(AvailableLoadersDocument, {
    variables: {
      locationId,
    },
    fetchPolicy: 'cache-and-network',
  });

  return {
    data,
    loading,
  };
}

export function useCreateTransferInventory(
  inventoryList: StockInActionsFragment[],
) {
  const { targetAction, inventorySignature, resetAll } = useInventoryActions();
  const handleError = useInventoryActionError();
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
        handleError(error);
      }
    },
    [
      handleError,
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

export function useHoldInventory(inventoryList: StockInActionsFragment[]) {
  const { targetAction, inventorySignature, resetAll } = useInventoryActions();
  const handleError = useInventoryActionError();
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
      handleError(error);
    }
  }, [
    handleError,
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
  inventoryList: StockInActionsFragment[],
) {
  const { targetAction, inventorySignature, resetAll } = useInventoryActions();
  const handleError = useInventoryActionError();
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
      handleError(error);
    }
  }, [
    handleError,
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

export function useAllocateInventory(inventoryList: StockInActionsFragment[]) {
  const { targetAction, inventorySignature, resetAll } = useInventoryActions();
  const handleError = useInventoryActionError();
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
        handleError(error);
      }
    },
    [
      handleError,
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
  inventoryList: StockInActionsFragment[],
) {
  const { targetAction, inventorySignature, resetAll } = useInventoryActions();
  const handleError = useInventoryActionError();
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
      handleError(error);
    }
  }, [
    handleError,
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

export function useShipInventory(inventoryList: StockInActionsFragment[]) {
  const { targetAction, resetAll } = useInventoryActions();
  const handleError = useInventoryActionError();
  const [updateShipInventoryOrder] = useMutation(
    UpdateShipInventoryOrderDocument,
    {
      refetchQueries: refetchQueriesAfterInventoryActions,
    },
  );

  const onSubmit = useCallback(
    async (values: ShipInventoryFieldValues) => {
      try {
        const targetItems = flatten(Object.values(values.items));
        const groupedItems = groupBy(targetItems, 'inventoryId');
        const validation = inventoryList.every((inventory) => {
          const groupedSignature = groupedItems[inventory.id];
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
          const { data } = await updateShipInventoryOrder({
            variables: {
              updateShipInventoryOrderId: values.shipInventoryOrder?.id ?? '',
              description: values.description || '',
              items: targetItems.map((item) => ({
                aggregatedKey: item.inventoryId,
                unitId: item.unitId,
                targetShippedQuantity: item.quantity,
                serialId: item.serialId,
              })),
            },
          });

          if (data?.updateShipInventoryOrder.id) {
            Message.success(`${targetAction?.submitText}成功`);
            resetAll();
          }
        }
      } catch (error) {
        handleError(error);
      }
    },
    [
      handleError,
      inventoryList,
      resetAll,
      targetAction?.submitText,
      updateShipInventoryOrder,
    ],
  );

  return {
    onSubmit,
  };
}

export function useSplitBatch(inventory?: StockInActionsFragment) {
  const { inventorySignature, targetAction, resetAll } = useInventoryActions();
  const handleError = useInventoryActionError();
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
        handleError(error);
      }
    },
    [
      handleError,
      currentUnitId,
      inventory,
      resetAll,
      splitBatch,
      targetAction?.submitText,
    ],
  );

  return {
    onSubmit,
  };
}

export function useMergeBatch(inventoryList: StockInActionsFragment[]) {
  const { targetAction, inventorySignature, resetAll } = useInventoryActions();
  const handleError = useInventoryActionError();
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
        handleError(error);
      }
    },
    [
      handleError,
      inventoryList,
      inventorySignature,
      mergeBatch,
      resetAll,
      targetAction,
    ],
  );

  return {
    onSubmit,
  };
}

export function useReclassifyInventory(
  inventoryList: StockInActionsFragment[],
) {
  const { targetAction, inventorySignature, resetAll } = useInventoryActions();
  const handleError = useInventoryActionError();
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
        handleError(error);
      }
    },
    [
      handleError,
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

export function useTransferVendor(inventoryList: StockInActionsFragment[]) {
  const { targetAction, inventorySignature, resetAll } = useInventoryActions();
  const handleError = useInventoryActionError();
  const [transferVendor] = useMutation(CreateTransferVendorOrderDocument, {
    refetchQueries: refetchQueriesAfterInventoryActions,
  });

  const onSubmit = useCallback(
    async (values: TransferToVendorFieldValues) => {
      try {
        const { data } = await transferVendor({
          variables: {
            vendorId: values.vendor,
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

        if (data?.createTransferVendorOrder.id) {
          Message.success(`${targetAction?.submitText}成功`);
          resetAll();
        }
      } catch (error) {
        handleError(error);
      }
    },
    [
      handleError,
      inventoryList,
      inventorySignature,
      resetAll,
      targetAction,
      transferVendor,
    ],
  );

  return {
    onSubmit,
  };
}

export function useReturnVendor(inventoryList: StockInActionsFragment[]) {
  const { targetAction, inventorySignature, resetAll } = useInventoryActions();
  const handleError = useInventoryActionError();
  const [returnVendor] = useMutation(ReturnTransferVendorOrderDocument, {
    refetchQueries: refetchQueriesAfterInventoryActions,
  });

  const onSubmit = useCallback(
    async (values: ReturnFromVendorFieldValues) => {
      try {
        const { data } = await returnVendor({
          variables: {
            items: formatAvailableInventoryList({
              inventoryList,
              targetAction,
              inventorySignature,
            }).map((s) => ({
              aggregatedKey: s.id,
              unitId: s.unitId,
              quantity: s.quantity,
              locationKey: values.location?.name ?? '',
              loaderKey: values.loader?.name,
            })),
          },
        });

        if (data?.returnTransferVendorOrder) {
          Message.success(`${targetAction?.submitText}成功`);
          resetAll();
        }
      } catch (error) {
        handleError(error);
      }
    },
    [
      handleError,
      inventoryList,
      inventorySignature,
      resetAll,
      returnVendor,
      targetAction,
    ],
  );

  return {
    onSubmit,
  };
}

export function useQualityInspection(inventoryList: StockInActionsFragment[]) {
  const { targetAction, inventorySignature, resetAll } = useInventoryActions();
  const handleError = useInventoryActionError();
  const [qualityInspect] = useMutation(InspectMaterialsDocument, {
    refetchQueries: refetchQueriesAfterInventoryActions,
  });

  const onSubmit = useCallback(
    async (values: QualityInspectionFieldValues, result: boolean) => {
      try {
        const { data } = await qualityInspect({
          variables: {
            key: values.key,
            note: values.description,
            items: formatAvailableInventoryList({
              inventoryList,
              targetAction,
              inventorySignature,
            }).map((s) => ({
              aggregateKey: s.id,
              unitId: s.unitId,
              quantity: s.quantity,
              inspectionResult: result,
            })),
          },
        });

        if (data?.inspectMaterials.id) {
          Message.success(`${targetAction?.submitText}成功`);
          resetAll();
        }
      } catch (error) {
        handleError(error);
      }
    },
    [
      handleError,
      inventoryList,
      inventorySignature,
      qualityInspect,
      resetAll,
      targetAction,
    ],
  );

  return {
    onSubmit,
  };
}

export function useTransferCustomer(inventoryList: StockInActionsFragment[]) {
  const { targetAction, inventorySignature, resetAll } = useInventoryActions();
  const handleError = useInventoryActionError();
  const [transferCustomer] = useMutation(CreateTransferCustomerOrderDocument, {
    refetchQueries: refetchQueriesAfterInventoryActions,
  });

  const onSubmit = useCallback(
    async (values: DeliverToCustomerFieldValues) => {
      try {
        const { data } = await transferCustomer({
          variables: {
            customerId: values.customer,
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

        if (data?.createTransferCustomerOrder.id) {
          Message.success(`${targetAction?.submitText}成功`);
          resetAll();
        }
      } catch (error) {
        handleError(error);
      }
    },
    [
      handleError,
      inventoryList,
      inventorySignature,
      resetAll,
      targetAction,
      transferCustomer,
    ],
  );

  return {
    onSubmit,
  };
}

export function useReturnCustomer(inventoryList: StockInActionsFragment[]) {
  const { targetAction, inventorySignature, resetAll } = useInventoryActions();
  const handleError = useInventoryActionError();
  const [returnCustomer] = useMutation(ReturnTransferCustomerOrderDocument, {
    refetchQueries: refetchQueriesAfterInventoryActions,
  });

  const onSubmit = useCallback(
    async (values: ReturnFromCustomerFieldValues) => {
      try {
        const { data } = await returnCustomer({
          variables: {
            items: formatAvailableInventoryList({
              inventoryList,
              targetAction,
              inventorySignature,
            }).map((s) => ({
              aggregatedKey: s.id,
              unitId: s.unitId,
              quantity: s.quantity,
              locationKey: values.location?.name ?? '',
              loaderKey: values.loader?.name,
            })),
          },
        });

        if (data?.returnTransferCustomerOrder) {
          Message.success(`${targetAction?.submitText}成功`);
          resetAll();
        }
      } catch (error) {
        handleError(error);
      }
    },
    [
      handleError,
      inventoryList,
      inventorySignature,
      resetAll,
      returnCustomer,
      targetAction,
    ],
  );

  return {
    onSubmit,
  };
}

export function useScrapInventory(inventoryList: StockInActionsFragment[]) {
  const { targetAction, inventorySignature, resetAll } = useInventoryActions();
  const handleError = useInventoryActionError();
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
      handleError(error);
    }
  }, [
    handleError,
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
