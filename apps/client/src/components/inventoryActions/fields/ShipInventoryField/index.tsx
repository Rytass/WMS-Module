import InputField from '../../../fields/InputField';
import classes from './index.module.scss';

function ShipInventoryField() {
  return (
    <div className={classes.host}>
      <div className={classes.selectorsWrapper}>
        <InputField name="description" label="備註" placeholder="輸入備註" />
      </div>
    </div>
  );
}

export default ShipInventoryField;
