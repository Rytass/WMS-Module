import InputField from '../../../fields/InputField';
import classes from './index.module.scss';

function TransferToVendorField() {
  return (
    <div className={classes.host}>
      <div className={classes.selectorsWrapper}>
        <InputField name="vendor" label="目標供應商" required />
        <InputField name="description" label="目標供應商名稱" disabled />
      </div>
    </div>
  );
}

export default TransferToVendorField;
