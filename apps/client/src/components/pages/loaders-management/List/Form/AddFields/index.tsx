import { useCallback, useEffect } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { LoaderUnit } from '../../../../../../graphql/generated/.graphql';
import InputField from '../../../../../fields/InputField';
import NumberInputField from '../../../../../fields/NumberInputField';
import LoaderTypesField from '../../../../../fields/LoaderTypesField';
import LoaderUnitsField from '../../../../../fields/LoaderUnitsField';
import LocationsField from '../../../../../fields/LocationsField';
import FormActionButtons from '../../../../../FormActionButtons';
import { formSchema } from './schema';
import { AddFormValues } from './typing';
import classes from './index.module.scss';

interface AddFieldsProps {
  onCreate: (values: AddFormValues) => void;
}

const AddFields: FC<AddFieldsProps> = ({ onCreate }) => {
  const methods = useForm<AddFormValues>({
    resolver: yupResolver(formSchema),
    defaultValues: {
      loaderType: null,
      location: null,
    },
  });

  const loaderType = methods.watch('loaderType');

  useEffect(() => {
    if (loaderType) {
      methods.setValue('typeKey', loaderType.id);
    } else {
      methods.setValue('typeKey', '');
    }
  }, [loaderType, methods]);

  const onSubmit = useCallback(
    (values: AddFormValues) => {
      onCreate(values);
      methods.reset();
    },
    [methods, onCreate],
  );

  return (
    <FormProvider {...methods}>
      <div className={classes.host}>
        <div className={classes.fieldsWrapper}>
          <div className={classes.baseFieldsWrapper}>
            <LoaderTypesField
              name="loaderType"
              label="載具類型"
              fuzzySearch={false}
              selectValueMode
              required
            />
            <InputField
              name="typeKey"
              placeholder="類型代碼"
              label="類型代碼"
              disabled
            />
            <LocationsField
              name="location"
              label="儲存位置"
              fuzzySearch={false}
              selectValueMode
              required
            />
            <NumberInputField
              name="quantity"
              label="數量"
              placeholder="輸入數量"
              required
            />
          </div>
          <div className={classes.sizeFieldsWrapper}>
            <NumberInputField
              name="length"
              label="長度"
              placeholder="輸入長度"
            />
            <NumberInputField
              name="width"
              label="寬度"
              placeholder="輸入寬度"
            />
            <NumberInputField
              name="height"
              label="高度"
              placeholder="輸入高度"
            />
            <LoaderUnitsField
              type={LoaderUnit.SIZE}
              name="sizeUnit"
              label="尺寸單位"
              placeholder="輸入尺寸單位"
              selectValueMode
            />
            <NumberInputField
              name="volume"
              label="容積"
              placeholder="輸入容積"
            />
            <LoaderUnitsField
              type={LoaderUnit.VOLUME}
              name="volumeUnit"
              label="容積單位"
              placeholder="輸入容積單位"
              selectValueMode
            />
          </div>
          <InputField name="remark" placeholder="輸入備註" label="備註" />
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
