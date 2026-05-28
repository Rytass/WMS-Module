import { useEffect, useMemo } from 'react';
import { useWatch, useFormContext } from 'react-hook-form';
import { unionBy } from 'lodash';
import LocationsField from '../../../fields/LocationsField';
import SingleAutoCompleteField from '../../../fields/SingleAutoCompleteField';
import MembersField from '../../../fields/MembersField';
import { options } from '../../../fields/MembersField/mock';
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
  const { setValue } = useFormContext<CreateTransferInventoryFieldValues>();
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
    return unionBy(
      [
        ...availableLoaders.map((l) => ({
          id: l.id,
          name: l.serialId,
        })),
        ...fullyFilledLoaders.map((l) => ({
          id: l.id,
          name: l.serialId,
        })),
      ],
      'id',
    );
  }, [availableLoaders, fullyFilledLoaders]);

  useEffect(() => {
    setValue('loader', null);
  }, [loaderOptions.length, setValue]);

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
        <SingleAutoCompleteField
          name="loader"
          label="目標載具"
          placeholder="輸入目標載具"
          fuzzySearch={false}
          options={loaderOptions}
        />
      </div>
      <div className={classes.receiverWrapper}>
        <MembersField
          name="receiver"
          options={options}
          label="接收者"
          placeholder="輸入接收者"
        />
        <InputField name="description" label="備註" placeholder="輸入備註" />
      </div>
    </div>
  );
}

export default CreateTransferInventoryField;
