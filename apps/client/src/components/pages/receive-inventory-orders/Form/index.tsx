import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { ReceiveInventoryOrderStatus } from '../../../../graphql/generated/.graphql';
import { FormWrapper } from '../../../fields/FormWrapper';
import ReceiveInventoryOrderFormBody from './FormBody';
import { formSchema } from './schema';
import { FormValues } from './typing';

interface ReceiveInventoryOrderFormBaseProps {
  defaultValues: FormValues;
  title: string;
  breadcrumbTitle: string;
  description: string;
  createdBy: string;
  createdAt: string;
  status: ReceiveInventoryOrderStatus;
}

type ReceiveInventoryOrderFormProps =
  | (ReceiveInventoryOrderFormBaseProps & {
      viewMode: false;
      onSubmit: (values: FormValues) => Promise<void>;
      submitText: string;
    })
  | (ReceiveInventoryOrderFormBaseProps & {
      viewMode: true;
      onSubmit?: never;
      submitText?: never;
    });

function ReceiveInventoryOrderForm({
  defaultValues,
  onSubmit,
  title,
  breadcrumbTitle,
  description,
  createdBy,
  createdAt,
  status,
  submitText,
  viewMode,
}: ReceiveInventoryOrderFormProps) {
  const methods = useForm<FormValues>({
    resolver: yupResolver(formSchema),
    defaultValues,
  });

  if (viewMode) {
    return (
      <FormWrapper methods={methods} isFormPage>
        <ReceiveInventoryOrderFormBody
          title={title}
          breadcrumbTitle={breadcrumbTitle}
          description={description}
          createdBy={createdBy}
          createdAt={createdAt}
          status={status}
          viewMode={viewMode}
        />
      </FormWrapper>
    );
  }

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
        description={description}
        createdBy={createdBy}
        createdAt={createdAt}
        status={status}
        viewMode={viewMode}
      />
    </FormWrapper>
  );
}

export default ReceiveInventoryOrderForm;
