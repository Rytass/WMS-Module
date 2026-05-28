import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { FormModalWrapper } from '../../../fields/FormModalWrapper';
import InputField from '../../../fields/InputField';
import { formSchema } from './schema';
import { FormValues } from './typing';
import classes from './index.module.scss';

interface CreateReceiveInventoryOrderFormProps {
  title: string;
  onSubmit: (values: FormValues) => Promise<void>;
  defaultValues: FormValues;
  submitText: string;
  closeModal: VoidFunction;
  open: boolean;
}

function CreateReceiveInventoryOrderForm({
  title,
  onSubmit,
  defaultValues,
  submitText,
  closeModal,
  open,
}: CreateReceiveInventoryOrderFormProps) {
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
      confirmMode="create"
      submitWithConfirm
      cancelWithConfirm={methods.formState.isDirty}
      size="narrow"
    >
      <div className={classes.host}>
        <InputField
          name="serial"
          label="入庫單號"
          placeholder="輸入入庫單號"
          size="main"
          required
        />
        <InputField
          name="description"
          label="備註"
          placeholder="輸入備註"
          size="main"
        />
      </div>
    </FormModalWrapper>
  );
}

export default CreateReceiveInventoryOrderForm;
