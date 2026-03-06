import LocationsField from '../../../fields/LocationsField';
import LoadersField from '../../../fields/LoadersField';
import classes from './index.module.scss';

function ReturnFromCustomerField() {
  return (
    <div className={classes.host}>
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
        required
      />
    </div>
  );
}

export default ReturnFromCustomerField;
