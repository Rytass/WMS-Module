import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { FormModalWrapper } from '../../../../fields/FormModalWrapper';
import InputField from '../../../../fields/InputField';
import SingleSelectByIdField from '../../../../fields/SingleSelectByIdField';
import { formSchema } from './schema';
import { FormValues } from './typing';
import classes from './index.module.scss';

interface InventoryMovementReceiveFormProps {
  title: string;
  onSubmit: (values: FormValues) => Promise<void>;
  defaultValues: FormValues;
  submitText: string;
  closeModal: VoidFunction;
  open: boolean;
}

function InventoryMovementReceiveForm({
  title,
  onSubmit,
  defaultValues,
  submitText,
  closeModal,
  open,
}: InventoryMovementReceiveFormProps) {
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
      size="wide"
    >
      InventoryMovementReceiveForm
    </FormModalWrapper>
  );
}

export default InventoryMovementReceiveForm;
