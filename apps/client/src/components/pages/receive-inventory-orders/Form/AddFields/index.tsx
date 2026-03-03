import { useCallback } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import FormActionButtons from '../../../../FormActionButtons';
import NumberInputField from '../../../../fields/NumberInputField';
import MaterialsField from '../../../../fields/MaterialsField';
import LocationsField from '../../../../fields/LocationsField';
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
          <MaterialsField name="material" fuzzySearch={false} required />
          <div>1</div>
          <div>1</div>
          <div>1</div>
          <LocationsField name="location" fuzzySearch={false} required />
          <div>1</div>
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
