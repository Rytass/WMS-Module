import { useMemo } from 'react';
import { useWatch } from 'react-hook-form';
import LocationsField from '../../../fields/LocationsField';
import LoadersField from '../../../fields/LoadersField';
import InputField from '../../../fields/InputField';
import { StockInActionsFragment } from '../../../../graphql/generated/.graphql';
import { useInventoryActions } from '../../../inventoryActions/useInventoryActions';
import { CreateTransferInventoryFieldValues } from './typing';
import classes from './index.module.scss';

interface CreateTransferInventoryFieldProps {
  inventoryList: StockInActionsFragment[];
}

function getBaseQuantity(
  item: StockInActionsFragment,
  signature: { quantity: number; unitId: string | null },
): number {
  if (signature.unitId) {
    const conversionFactor = item.material.materialUnits.find(
      (u) => u.id === signature.unitId,
    )?.conversionFactor;

    if (conversionFactor) {
      return signature.quantity * conversionFactor;
    }
  }

  return signature.quantity;
}

function CreateTransferInventoryField({
  inventoryList,
}: CreateTransferInventoryFieldProps) {
  const location = useWatch<CreateTransferInventoryFieldValues, 'location'>({
    name: 'location',
  });
  const { inventorySignature } = useInventoryActions();

  const fullyFilledLoaderIds = useMemo(() => {
    const loaderMap = new Map<
      string,
      { totalQuantity: number; operatedQuantity: number }
    >();

    for (const item of inventoryList) {
      if (!item.loader) continue;

      const loaderId = item.loader.id;

      if (!loaderMap.has(loaderId)) {
        loaderMap.set(loaderId, {
          totalQuantity: item.loader.totalQuantity,
          operatedQuantity: 0,
        });
      }

      const signature = inventorySignature[item.id];

      if (signature) {
        loaderMap.get(loaderId)!.operatedQuantity += getBaseQuantity(
          item,
          signature,
        );
      }
    }

    return new Set(
      [...loaderMap.entries()]
        .filter(
          ([, { totalQuantity, operatedQuantity }]) =>
            operatedQuantity >= totalQuantity,
        )
        .map(([id]) => id),
    );
  }, [inventoryList, inventorySignature]);

  console.log('fullyFilledLoaderIds', fullyFilledLoaderIds);

  return (
    <div className={classes.host}>
      <div className={classes.selectorsWrapper}>
        <LocationsField
          name="location"
          label="目標位置"
          fuzzySearch={false}
          selectValueMode
          required
        />
        <LoadersField
          name="loader"
          label="目標載具"
          fuzzySearch={false}
          selectValueMode
          relativeLocationId={location ? location.id : undefined}
        />
      </div>
      <div className={classes.receiverWrapper}>
        <InputField name="receiver" label="接收者" placeholder="輸入接收者" />
        <InputField name="description" label="備註" placeholder="輸入備註" />
      </div>
    </div>
  );
}

export default CreateTransferInventoryField;
