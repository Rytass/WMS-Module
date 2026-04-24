import { useWatch } from 'react-hook-form';
import LocationsField from '../../../fields/LocationsField';
import LoadersField from '../../../fields/LoadersField';
import InputField from '../../../fields/InputField';
import { CreateTransferInventoryFieldValues } from './typing';
import classes from './index.module.scss';

function CreateTransferInventoryField() {
  const location = useWatch<CreateTransferInventoryFieldValues, 'location'>({
    name: 'location',
  });

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
