import InputField from '../../../fields/InputField';
import classes from './index.module.scss';

function MergeBatchField() {
  return (
    <div className={classes.host}>
      <InputField
        name="newKey"
        label="新批號"
        placeholder="輸入新批號"
        required
      />
    </div>
  );
}

export default MergeBatchField;
