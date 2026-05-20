import { useMemo } from 'react';
import { useWatch } from 'react-hook-form';
import LocationsField from '../../../fields/LocationsField';
import LoadersField from '../../../fields/LoadersField';
import InputField from '../../../fields/InputField';
import { StockInActionsFragment } from '../../../../graphql/generated/.graphql';
import { useInventoryActions } from '../../../inventoryActions/useInventoryActions';
import { useFullyFilledLoadersByInventoryList } from '../../../../hooks/useFullyFilledLoadersByInventoryList';
import { CreateTransferInventoryFieldValues } from './typing';
import { useQueryAvailableLoaders } from '../../useApi';
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
  const { data } = useQueryAvailableLoaders(location?.id);

  const availableLoaders = useMemo(
    () => data?.availableLoaders ?? [],
    [data?.availableLoaders],
  );

  const fullyFilledLoaders = useFullyFilledLoadersByInventoryList({
    inventoryList,
    inventorySignature,
  });

  const loaderOptions = useMemo(() => {
    return [
      ...availableLoaders.map((l) => ({
        id: l.id,
        name: l.serialId,
      })),
      ...fullyFilledLoaders.map((l) => ({
        id: l.id,
        name: l.serialId,
      })),
    ];
  }, [availableLoaders, fullyFilledLoaders]);

  console.log('loaderOptions', loaderOptions);

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
