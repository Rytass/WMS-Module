import InputField from '../../../fields/InputField';
import classes from './index.module.scss';

function CreateTransferInventoryField() {
  return (
    <div className={classes.host}>
      <InputField
        name="description"
        label="備註"
        placeholder="輸入備註"
        required
      />
    </div>
  );
}

export default CreateTransferInventoryField;
