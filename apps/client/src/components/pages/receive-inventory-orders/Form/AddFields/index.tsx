import { useCallback, useState, useEffect } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { SelectValue } from '@mezzanine-ui/react';
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
import { BASE_UNIT, YesOrNo } from '../../../../../utils/share';
import { useLazyQueryMaterial } from '../useApi';
import { formSchema } from './schema';
import { AddFormValues } from './typing';
import classes from './index.module.scss';

interface AddFieldsProps {
  onCreate: (values: AddFormValues, unitOptions: SelectValue[]) => void;
}

const AddFields: FC<AddFieldsProps> = ({ onCreate }) => {
  const [unitOptions, setUnitOptions] = useState<SelectValue[]>([]);
  const methods = useForm<AddFormValues>({
    resolver: yupResolver(formSchema),
    defaultValues: {
      inspection: YesOrNo.YES,
    },
  });

  const materialKey = methods.watch('material');

  const { fetchMaterial } = useLazyQueryMaterial();

  const doFetchMaterial = useCallback(async () => {
    const { data } = await fetchMaterial({
      variables: {
        key: materialKey,
      },
    });

    if (data?.material.id) {
      const material = data.material;

      methods.setValue('description', material.description);
      methods.setValue('unit', '');

      setUnitOptions([
        {
          id: BASE_UNIT,
          name: material.baseUnit.key,
        },
        ...material.materialUnits.map((u) => ({
          id: u.id,
          name: u.unit,
        })),
      ]);
    }
  }, [fetchMaterial, materialKey, methods]);

  useEffect(() => {
    if (materialKey) {
      doFetchMaterial();
    } else {
      methods.setValue('description', '');
      methods.setValue('unit', '');
    }
  }, [doFetchMaterial, materialKey, methods]);

  const onSubmit = useCallback(
    (values: AddFormValues) => {
      onCreate(values, unitOptions);
    },
    [onCreate, unitOptions],
  );

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
          <BatchesField name="batch" addable fuzzySearch={false} required />
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
            placeholder="使用單位"
            options={unitOptions}
            size="sub"
            disabled={!materialKey}
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
