import { useCallback, useState, useEffect } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { SelectValue, Message } from '@mezzanine-ui/react';
import { yupResolver } from '@hookform/resolvers/yup';
import FormActionButtons from '../../../../FormActionButtons';
import YesNoField from '../../../../fields/YesNoField';
import InputField from '../../../../fields/InputField';
import SingleSelectByIdField from '../../../../fields/SingleSelectByIdField';
import NumberInputField from '../../../../fields/NumberInputField';
import MaterialsField from '../../../../fields/MaterialsField';
import BatchesField from '../../../../fields/BatchesField';
import LocationsField from '../../../../fields/LocationsField';
import AvailableLoadersField from '../../../../fields/AvailableLoadersField';
import { YesOrNo } from '../../../../../utils/share';
import { getMaterialUnitOptions } from '../../../../inventoryActions/utils';
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
      material: null,
      batch: null,
      location: null,
      loader: null,
    },
  });

  const materialSelectValue = methods.watch('material');
  const locationValue = methods.watch('location');

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

      setUnitOptions(getMaterialUnitOptions(material));
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
      Message.success('已成功新增項目');
    },
    [onCreate, unitOptions, methods],
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
          />
          <LocationsField
            name="location"
            label="目標位置"
            fuzzySearch={false}
            selectValueMode
          />
          <AvailableLoadersField
            name="loader"
            label="目標載具"
            fuzzySearch={false}
            selectValueMode
            relativeLocationId={locationValue ? locationValue.id : undefined}
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
