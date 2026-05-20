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

function CreateTransferInventoryField({
  inventoryList,
}: CreateTransferInventoryFieldProps) {
  const location = useWatch<CreateTransferInventoryFieldValues, 'location'>({
    name: 'location',
  });
  const { inventorySignature } = useInventoryActions();

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

  console.log('fullyFilledLoaders', fullyFilledLoaders);

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
