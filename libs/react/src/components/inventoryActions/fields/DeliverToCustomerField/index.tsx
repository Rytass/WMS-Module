import { useEffect } from 'react';
import { useWatch, useFormContext } from 'react-hook-form';
import MembersField from '../../../fields/MembersField';
import { options } from '../../../fields/MembersField/mock';
import InputField from '../../../fields/InputField';
import { DeliverToCustomerFieldValues } from './typing';
import classes from './index.module.scss';

function ReclassifyInventoryField() {
  const { setValue } = useFormContext<DeliverToCustomerFieldValues>();

  const customer = useWatch<DeliverToCustomerFieldValues, 'customer'>({
    name: 'customer',
  });

  useEffect(() => {
    setValue('description', customer);
  }, [setValue, customer]);

  return (
    <div className={classes.host}>
      <div className={classes.selectorsWrapper}>
        <MembersField
          name="customer"
          options={options}
          label="目標客戶倉"
          required
        />
        <InputField name="description" label="目標客戶倉名稱" disabled />
      </div>
    </div>
  );
}

export default ReclassifyInventoryField;
