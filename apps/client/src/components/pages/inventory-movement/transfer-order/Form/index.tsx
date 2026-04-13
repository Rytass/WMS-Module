import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { FormWrapper } from '../../../../fields/FormWrapper';
import TransferOrderFormBody from './FormBody';
import { formSchema } from './schema';
import { FormValues } from './typing';

interface TransferOrderFormProps {
  defaultValues: FormValues;
  title: string;
  breadcrumbTitle: string;
}

function TransferOrderForm({
  defaultValues,
  title,
  breadcrumbTitle,
}: TransferOrderFormProps) {
  const methods = useForm<FormValues>({
    resolver: yupResolver(formSchema),
    defaultValues,
  });

  return (
    <FormWrapper
      methods={methods}
      havePageFooter
      submitText="儲存"
      // onSubmit={onSubmit}
      pureFormProvider
    >
      <TransferOrderFormBody title={title} breadcrumbTitle={breadcrumbTitle} />
    </FormWrapper>
  );
}

export default TransferOrderForm;
