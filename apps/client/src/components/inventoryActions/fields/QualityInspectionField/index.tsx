import InputField from '../../../fields/InputField';
import classes from './index.module.scss';

function QualityInspectionField() {
  return (
    <div className={classes.host}>
      <InputField name="description" label="備註" placeholder="輸入備註" />
    </div>
  );
}

export default QualityInspectionField;
