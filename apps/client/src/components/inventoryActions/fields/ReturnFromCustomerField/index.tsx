import { useWatch } from 'react-hook-form';
import LocationsField from '../../../fields/LocationsField';
import LoadersField from '../../../fields/LoadersField';
import { ReturnFromCustomerFieldValues } from './typing';
import classes from './index.module.scss';

function ReturnFromCustomerField() {
  const location = useWatch<ReturnFromCustomerFieldValues, 'location'>({
    name: 'location',
  });

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
        relativeLocationId={location ? location.id : undefined}
        required
      />
    </div>
  );
}

export default ReturnFromCustomerField;
