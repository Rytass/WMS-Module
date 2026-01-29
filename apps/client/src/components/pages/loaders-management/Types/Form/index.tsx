import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { FormModalWrapper } from '../../../../fields/FormModalWrapper';
import InputField from '../../../../fields/InputField';
import { formSchema } from './schema';
import { FormValues } from './typing';
import classes from './index.module.scss';

interface LoaderTypeFormProps {
  title: string;
  onSubmit: (values: FormValues) => Promise<void>;
  defaultValues: FormValues;
  submitText: string;
  closeModal: VoidFunction;
  open: boolean;
  mode: 'create' | 'edit';
}

function LoaderTypeForm({
  title,
  onSubmit,
  defaultValues,
  submitText,
  closeModal,
  open,
  mode,
}: LoaderTypeFormProps) {
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
      submitWithConfirm
      cancelWithConfirm={methods.formState.isDirty}
    >
      <div className={classes.host}>
        <InputField
          name="description"
          label="類型說明"
          placeholder="輸入類型說明"
          size="main"
          required
        />
        <InputField
          name="serial"
          label="類型代碼"
          placeholder="輸入類型代碼"
          size="main"
          required
        />
      </div>
    </FormModalWrapper>
  );
}

export default LoaderTypeForm;
