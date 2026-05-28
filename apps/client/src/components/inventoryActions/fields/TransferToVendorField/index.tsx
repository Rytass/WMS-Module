import { useEffect } from 'react';
import { useWatch, useFormContext } from 'react-hook-form';
import MembersField from '../../../fields/MembersField';
import { options } from '../../../fields/MembersField/mock';
import InputField from '../../../fields/InputField';
import { TransferToVendorFieldValues } from './typing';
import classes from './index.module.scss';

function TransferToVendorField() {
  const { setValue } = useFormContext<TransferToVendorFieldValues>();

  const vendor = useWatch<TransferToVendorFieldValues, 'vendor'>({
    name: 'vendor',
  });

  useEffect(() => {
    setValue('description', vendor);
  }, [setValue, vendor]);

  return (
    <div className={classes.host}>
      <div className={classes.selectorsWrapper}>
        <MembersField
          name="vendor"
          options={options}
          label="目標供應商"
          required
        />
        <InputField name="description" label="目標供應商名稱" disabled />
      </div>
    </div>
  );
}

export default TransferToVendorField;
