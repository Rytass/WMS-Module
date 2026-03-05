import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { ReceiveInventoryOrderStatus } from '../../../../graphql/generated/.graphql';
import { FormWrapper } from '../../../fields/FormWrapper';
import ReceiveInventoryOrderFormBody from './FormBody';
import { formSchema } from './schema';
import { FormValues } from './typing';

interface ReceiveInventoryOrderFormProps {
  defaultValues: FormValues;
  onSubmit: (values: FormValues) => Promise<void>;
  title: string;
  breadcrumbTitle: string;
  createdBy: string;
  createdAt: string;
  status: ReceiveInventoryOrderStatus;
  submitText: string;
}

function ReceiveInventoryOrderForm({
  defaultValues,
  onSubmit,
  title,
  breadcrumbTitle,
  createdBy,
  createdAt,
  status,
  submitText,
}: ReceiveInventoryOrderFormProps) {
  const methods = useForm<FormValues>({
    resolver: yupResolver(formSchema),
    defaultValues,
  });

  return (
    <FormWrapper
      methods={methods}
      havePageFooter
      submitText={submitText}
      onSubmit={onSubmit}
      pureFormProvider
    >
      <ReceiveInventoryOrderFormBody
        title={title}
        breadcrumbTitle={breadcrumbTitle}
        createdBy={createdBy}
        createdAt={createdAt}
        status={status}
      />
    </FormWrapper>
  );
}

export default ReceiveInventoryOrderForm;
