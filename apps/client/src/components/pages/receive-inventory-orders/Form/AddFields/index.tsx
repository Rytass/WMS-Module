import { useCallback } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import FormActionButtons from '../../../../FormActionButtons';
import NumberInputField from '../../../../fields/NumberInputField';
import MaterialsField from '../../../../fields/MaterialsField';
import BatchesField from '../../../../fields/BatchesField';
import LocationsField from '../../../../fields/LocationsField';
import LoadersField from '../../../../fields/LoadersField';
import { formSchema } from './schema';
import { FormValues } from './typing';
import classes from './index.module.scss';

const AddFields: FC = () => {
  const methods = useForm<FormValues>({
    resolver: yupResolver(formSchema),
    defaultValues: {
      material: '',
    },
  });

  const onSubmit = useCallback((values: FormValues) => {
    console.log('values', values);
  }, []);

  return (
    <FormProvider {...methods}>
      <div className={classes.host}>
        <div className={classes.fieldsWrapper}>
          <div>1</div>
          <MaterialsField name="material" fuzzySearch={false} required />
          <div>1</div>
          <BatchesField name="batch" addable fuzzySearch={false} />
          <LocationsField
            name="location"
            label="目標位置"
            fuzzySearch={false}
            required
          />
          <LoadersField
            name="loader"
            label="目標載具"
            fuzzySearch={false}
            required
          />
          <NumberInputField
            name="quantity"
            label="入庫數量"
            placeholder="輸入入庫數量"
            required
          />
          <div>1</div>
        </div>
        <FormActionButtons
          onReset={() => {
            console.log('reset');
          }}
          onClickSubmit={() => {
            methods.handleSubmit(onSubmit)();
          }}
          submitText="新增"
          submitButtonType="button"
        />
      </div>
    </FormProvider>
  );
};

export default AddFields;
