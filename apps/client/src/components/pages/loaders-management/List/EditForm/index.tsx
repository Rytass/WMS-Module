import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { FormModalWrapper } from '../../../../fields/FormModalWrapper';
import InputField from '../../../../fields/InputField';
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
        <InputField
          name="remark"
          label="備註"
          placeholder="輸入備註"
          size="main"
          required
        />
      </div>
    </FormModalWrapper>
  );
}

export default LoaderEditForm;
