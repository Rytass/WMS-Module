import InputField from '../../../fields/InputField';
import classes from './index.module.scss';

function ReclassifyInventoryField() {
  return (
    <div className={classes.host}>
      <div className={classes.selectorsWrapper}>
        <InputField name="customer" label="目標客戶倉" required />
        <InputField name="description" label="目標客戶倉名稱" disabled />
      </div>
    </div>
  );
}

export default ReclassifyInventoryField;
