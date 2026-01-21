import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { FormModalWrapper } from '../../../fields/FormModalWrapper';
import InputField from '../../../fields/InputField';
import { formSchema } from './schema';
import { FormValues } from './typing';

interface MaterialsManagementFormProps {
  title: string;
  onSubmit: (values: FormValues) => Promise<void>;
  submitText: string;
  closeModal: VoidFunction;
  open: boolean;
}

function MaterialsManagementForm({
  title,
  onSubmit,
  submitText,
  closeModal,
  open,
}: MaterialsManagementFormProps) {
  const methods = useForm<FormValues>({
    resolver: yupResolver(formSchema),
    defaultValues: {
      demo: '',
    },
  });

  return (
    <FormModalWrapper<FormValues>
      methods={methods}
      title={title}
      confirmText={submitText}
      onSubmit={onSubmit}
      closeModal={closeModal}
      open={open}
    >
      <InputField name="demo" label="demo" />
    </FormModalWrapper>
  );
}

export default MaterialsManagementForm;
