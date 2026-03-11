import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { FormModalWrapper } from '../../../../fields/FormModalWrapper';
import NumberInputField from '../../../../fields/NumberInputField';
import InputField from '../../../../fields/InputField';
import DateField from '../../../../fields/DateField';
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
        <div className={classes.innerWrapper}>
          <NumberInputField name="length" label="長度" placeholder="輸入長度" />
          <NumberInputField name="width" label="寬度" placeholder="輸入寬度" />
        </div>
        <div className={classes.innerWrapper}>
          <NumberInputField name="height" label="高度" placeholder="輸入高度" />
          <div>尺寸單位</div>
        </div>
        <NumberInputField name="volume" label="容積" placeholder="輸入容積" />
        <div>容積單位</div>
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
