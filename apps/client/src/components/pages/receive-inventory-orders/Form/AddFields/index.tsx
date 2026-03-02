import FormActionButtons from '../../../../FormActionButtons';
import classes from './index.module.scss';

const AddFields: FC = () => {
  return (
    <div className={classes.host}>
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
