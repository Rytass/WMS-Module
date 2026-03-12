import { useCallback, useState, useEffect } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { SelectValue, Message } from '@mezzanine-ui/react';
import { yupResolver } from '@hookform/resolvers/yup';
import FormActionButtons from '../../../../FormActionButtons';
import InputField from '../../../../fields/InputField';
import SingleSelectByIdField from '../../../../fields/SingleSelectByIdField';
import NumberInputField from '../../../../fields/NumberInputField';
import MaterialsField from '../../../../fields/MaterialsField';
import BatchesField from '../../../../fields/BatchesField';
import SaleOrderIdsField from '../../../../fields/SaleOrderIdsField';
import SaleOrdersField from '../../../../fields/SaleOrdersField';
import { BASE_UNIT } from '../../../../../utils/share';
import { useLazyQueryMaterial } from '../useApi';
import { usePreviousValue } from '../../../../../hooks/usePreviousValue';
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
      material: null,
      batch: null,
    },
  });

  const materialSelectValue = methods.watch('material');
  const saleIdSelectValue = methods.watch('saleId');
  const prevSaleIdSelectValue = usePreviousValue(saleIdSelectValue);

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

  useEffect(() => {
    if (prevSaleIdSelectValue?.id !== saleIdSelectValue?.id) {
      methods.setValue('saleSerialId', null);
    }
  }, [methods, prevSaleIdSelectValue?.id, saleIdSelectValue?.id]);

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
          <MaterialsField
            name="material"
            fuzzySearch={false}
            selectValueMode
            required
          />
          <InputField name="description" label="物料說明" disabled />
          <BatchesField
            name="batch"
            fuzzySearch={false}
            selectValueMode
            required
          />
          <div />
          <NumberInputField
            name="quantity"
            label="應出數量"
            placeholder="輸入應出數量"
            required
          />
          <SingleSelectByIdField
            name="unit"
            label="出庫單位"
            placeholder="出庫單位"
            options={unitOptions}
            size="sub"
            disabled={!materialSelectValue}
            required
          />
          <SaleOrderIdsField
            name="saleId"
            addable
            fuzzySearch={false}
            selectValueMode
          />
          <SaleOrdersField
            saleOrdersId={saleIdSelectValue?.id ?? ''}
            name="saleSerialId"
            addable
            fuzzySearch={false}
            selectValueMode
            disabled={!saleIdSelectValue}
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
