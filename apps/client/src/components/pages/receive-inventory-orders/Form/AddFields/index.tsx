import FormActionButtons from '../../../../FormActionButtons';
import classes from './index.module.scss';

const AddFields: FC = () => {
  return (
    <div className={classes.host}>
      <div className={classes.fieldsWrapper}>
        <div>1</div>
        <div>1</div>
        <div>1</div>
        <div>1</div>
        <div>1</div>
        <div>1</div>
        <div>1</div>
        <div>1</div>
      </div>
      <FormActionButtons
        onReset={() => {
          console.log('reset');
        }}
        onClickSubmit={() => {
          console.log('create');
        }}
        submitText="新增"
        submitButtonType="button"
      />
    </div>
  );
};

export default AddFields;
