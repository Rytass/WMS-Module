import InputField from '../../../fields/InputField';
import classes from './index.module.scss';

function QualityInspectionField() {
  return (
    <div className={classes.host}>
      <InputField
        name="key"
        label="檢驗單號"
        placeholder="輸入檢驗單號"
        required
      />
      <InputField name="description" label="備註" placeholder="輸入備註" />
    </div>
  );
}

export default QualityInspectionField;
