import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { FormModalWrapper } from '../../../../fields/FormModalWrapper';
import LoaderTypesField from '../../../../fields/LoaderTypesField';
import LoaderUnitsField from '../../../../fields/LoaderUnitsField';
import LocationsField from '../../../../fields/LocationsField';
import NumberInputField from '../../../../fields/NumberInputField';
import InputField from '../../../../fields/InputField';
import DateField from '../../../../fields/DateField';
import { LoaderUnit } from '../../../../../graphql/generated/.graphql';
import { formSchema } from './schema';
import { FormValues } from './typing';
import classes from './index.module.scss';

interface LoaderEditFormProps {
  title: string;
  onSubmit: (values: FormValues) => Promise<void>;
  defaultValues: FormValues;
  submitText: string;
  closeModal: VoidFunction;
  open: boolean;
  mode: 'create' | 'edit';
}

function LoaderEditForm({
  title,
  onSubmit,
  defaultValues,
  submitText,
  closeModal,
  open,
  mode,
}: LoaderEditFormProps) {
  const methods = useForm<FormValues>({
    resolver: yupResolver(formSchema),
    defaultValues,
  });

  return (
    <FormModalWrapper<FormValues>
      methods={methods}
      title={title}
      confirmText={submitText}
      onSubmit={onSubmit}
      closeModal={closeModal}
      open={open}
      mode={mode}
      size="narrow"
      submitWithConfirm
      cancelWithConfirm={methods.formState.isDirty}
    >
      <div className={classes.host}>
        <LoaderTypesField
          name="loaderType"
          label="載具類型"
          fuzzySearch={false}
          selectValueMode
          disabled
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
          disabled
        />
        <div className={classes.innerWrapper}>
          <NumberInputField name="length" label="長度" placeholder="輸入長度" />
          <NumberInputField name="width" label="寬度" placeholder="輸入寬度" />
        </div>
        <div className={classes.innerWrapper}>
          <NumberInputField name="height" label="高度" placeholder="輸入高度" />
          <LoaderUnitsField
            type={LoaderUnit.SIZE}
            name="sizeUnit"
            label="尺寸單位"
            placeholder="輸入尺寸單位"
            selectValueMode
          />
        </div>
        <NumberInputField name="volume" label="容積" placeholder="輸入容積" />
        <LoaderUnitsField
          type={LoaderUnit.VOLUME}
          name="volumeUnit"
          label="容積單位"
          placeholder="輸入容積單位"
          selectValueMode
        />
        <DateField name="createdAt" label="建立日期" disabled />
        <InputField
          name="remark"
          label="備註"
          placeholder="輸入備註"
          required
        />
      </div>
    </FormModalWrapper>
  );
}

export default LoaderEditForm;
