import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { FormWrapper } from '../../../fields/FormWrapper';
import ReceiveInventoryOrderFormBody from './FormBody';
import { formSchema } from './schema';
import { FormValues } from './typing';

interface ReceiveInventoryOrderFormProps {
  onSubmit: (values: FormValues) => Promise<void>;
  title: string;
  breadcrumbTitle: string;
  submitText: string;
}

function ReceiveInventoryOrderForm({
  onSubmit,
  title,
  breadcrumbTitle,
  submitText,
}: ReceiveInventoryOrderFormProps) {
  const methods = useForm<FormValues>({
    resolver: yupResolver(formSchema),
    defaultValues: {
      demo: '',
    },
  });

  return (
    <FormWrapper
      methods={methods}
      havePageFooter
      submitText={submitText}
      onSubmit={onSubmit}
    >
      <ReceiveInventoryOrderFormBody
        title={title}
        breadcrumbTitle={breadcrumbTitle}
      />
    </FormWrapper>
  );
}

export default ReceiveInventoryOrderForm;
