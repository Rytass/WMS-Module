import { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { FormWrapper } from '../../../../fields/FormWrapper';
import TransferOrderFormBody from './FormBody';
import { useUpdateTransferOrder } from '../../useApi';
import { formSchema } from './schema';
import { FormValues } from './typing';

interface TransferOrderFormProps {
  defaultValues: FormValues;
  title: string;
  breadcrumbTitle: string;
  createdBy?: string | null;
  receiver?: string | null;
  createdAt: string;
}

function TransferOrderForm({
  defaultValues,
  title,
  breadcrumbTitle,
  createdBy,
  receiver,
  createdAt,
}: TransferOrderFormProps) {
  const { updateTransferOrder } = useUpdateTransferOrder();
  const methods = useForm<FormValues>({
    resolver: yupResolver(formSchema),
    defaultValues,
  });

  const onSubmit = useCallback(async (values: FormValues) => {
    console.log('儲存', values);
  }, []);

  return (
    <FormWrapper
      methods={methods}
      havePageFooter
      submitText="儲存"
      onSubmit={onSubmit}
      pureFormProvider
    >
      <TransferOrderFormBody
        title={title}
        breadcrumbTitle={breadcrumbTitle}
        createdBy={createdBy}
        receiver={receiver}
        createdAt={createdAt}
      />
    </FormWrapper>
  );
}

export default TransferOrderForm;
