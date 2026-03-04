import { useCallback } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import FormActionButtons from '../../../../FormActionButtons';
import YesNoField from '../../../../fields/YesNoField';
import InputField from '../../../../fields/InputField';
import SingleSelectField from '../../../../fields/SingleSelectField';
import NumberInputField from '../../../../fields/NumberInputField';
import MaterialsField from '../../../../fields/MaterialsField';
import BatchesField from '../../../../fields/BatchesField';
import LocationsField from '../../../../fields/LocationsField';
import LoadersField from '../../../../fields/LoadersField';
import { YesOrNo } from '../../../../../utils/share';
import { useLazyQueryMaterial } from '../useApi';
import { formSchema } from './schema';
import { FormValues } from './typing';
import classes from './index.module.scss';

const AddFields: FC = () => {
  const methods = useForm<FormValues>({
    resolver: yupResolver(formSchema),
    defaultValues: {
      inspection: YesOrNo.YES,
    },
  });

  const { fetchMaterial, data, loading } = useLazyQueryMaterial();

  const onSubmit = useCallback((values: FormValues) => {
    console.log('values', values);
  }, []);

  return (
    <FormProvider {...methods}>
      <div className={classes.host}>
        <div className={classes.fieldsWrapper}>
          <YesNoField
            name="inspection"
            label="是否要檢驗"
            placeholder="是否要檢驗"
            required
          />
          <MaterialsField name="material" fuzzySearch={false} required />
          <InputField name="description" label="物料說明" disabled />
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
          <SingleSelectField
            name="unit"
            label="使用單位"
            options={[]}
            size="sub"
            disabled
            required
          />
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
