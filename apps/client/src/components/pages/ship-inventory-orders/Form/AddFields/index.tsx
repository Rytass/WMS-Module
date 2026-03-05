import { useCallback, useState, useEffect } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { SelectValue } from '@mezzanine-ui/react';
import { yupResolver } from '@hookform/resolvers/yup';
import FormActionButtons from '../../../../FormActionButtons';
import InputField from '../../../../fields/InputField';
import SingleSelectByIdField from '../../../../fields/SingleSelectByIdField';
import NumberInputField from '../../../../fields/NumberInputField';
import MaterialsField from '../../../../fields/MaterialsField';
import BatchesField from '../../../../fields/BatchesField';
import LocationsField from '../../../../fields/LocationsField';
import LoadersField from '../../../../fields/LoadersField';
import { BASE_UNIT } from '../../../../../utils/share';
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
  });

  const materialSelectValue = methods.watch('material');

  const { fetchMaterial } = useLazyQueryMaterial();

  const doFetchMaterial = useCallback(async () => {
    const { data } = await fetchMaterial({
      variables: {
        key: materialSelectValue?.name,
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
  }, [fetchMaterial, materialSelectValue?.name, methods]);

  useEffect(() => {
    if (materialSelectValue) {
      doFetchMaterial();
    } else {
      methods.setValue('description', '');
      methods.setValue('unit', '');
    }
  }, [doFetchMaterial, materialSelectValue, methods]);

  const onSubmit = useCallback(
    (values: AddFormValues) => {
      onCreate(values, unitOptions);
      methods.reset();
    },
    [onCreate, unitOptions, methods],
  );

  return (
    <FormProvider {...methods}>
      <div className={classes.host}>
        <div className={classes.fieldsWrapper}>
          <MaterialsField
            name="material"
            fuzzySearch={false}
            selectValueMode
            required
          />
          <InputField name="description" label="物料說明" disabled />
          <BatchesField
            name="batch"
            addable
            fuzzySearch={false}
            selectValueMode
            required
          />
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
          <NumberInputField
            name="quantity"
            label="入庫數量"
            placeholder="輸入入庫數量"
            required
          />
          <SingleSelectByIdField
            name="unit"
            label="使用單位"
            placeholder="使用單位"
            options={unitOptions}
            size="sub"
            disabled={!materialSelectValue}
            required
          />
        </div>
        <FormActionButtons
          onReset={() => {
            methods.reset();
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
