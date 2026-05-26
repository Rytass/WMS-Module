import { useMemo } from 'react';
import { StockInActionsFragment } from '../graphql/generated/.graphql';
import { InventorySignature } from '../components/inventoryActions/typing';

export function useFullyFilledLoadersByInventoryList({
  inventoryList,
  inventorySignature,
}: {
  inventoryList: StockInActionsFragment[];
  inventorySignature: InventorySignature;
}) {
  const fullyFilledLoaders = useMemo(() => {
    const loaderMap = inventoryList.reduce<
      Record<
        string,
        {
          loader: { id: string; serialId: string };
          totalQuantity: number;
          operatedQuantity: number;
        }
      >
    >((acc, item) => {
      if (!item.loader) return acc;

      const loaderId = item.loader.id;
      const signature = inventorySignature[item.id];
      const conversionFactor = signature?.unitId
        ? (item.material.materialUnits.find((u) => u.id === signature.unitId)
            ?.conversionFactor ?? 1)
        : 1;

      return {
        ...acc,
        [loaderId]: {
          loader: { id: item.loader.id, serialId: item.loader.serialId },
          totalQuantity: item.loader.totalQuantity,
          operatedQuantity:
            (acc[loaderId]?.operatedQuantity ?? 0) +
            (signature?.quantity ?? 0) * conversionFactor,
        },
      };
    }, {});

    return Object.values(loaderMap)
      .filter(
        ({ totalQuantity, operatedQuantity }) =>
          operatedQuantity === totalQuantity,
      )
      .map(({ loader }) => loader);
  }, [inventoryList, inventorySignature]);

  return fullyFilledLoaders;
}
