import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { ShipInventoryOrderStatus } from '../../../../graphql/generated/.graphql';
import { FormWrapper } from '../../../fields/FormWrapper';
import ShipInventoryOrderFormBody from './FormBody';
import { formSchema } from './schema';
import { FormValues } from './typing';

interface ShipInventoryOrderFormBaseProps {
  defaultValues: FormValues;
  title: string;
  breadcrumbTitle: string;
  description: string;
  createdBy: string;
  createdAt: string;
  status: ShipInventoryOrderStatus;
}

type ShipInventoryOrderFormProps =
  | (ShipInventoryOrderFormBaseProps & {
      viewMode: false;
      onSubmit: (values: FormValues) => Promise<void>;
      submitText: string;
    })
  | (ShipInventoryOrderFormBaseProps & {
      viewMode: true;
      onSubmit?: never;
      submitText?: never;
    });

function ShipInventoryOrderForm({
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
}: ShipInventoryOrderFormProps) {
  const methods = useForm<FormValues>({
    resolver: yupResolver(formSchema),
    defaultValues,
  });

  if (viewMode) {
    return (
      <FormWrapper methods={methods} isFormPage>
        <ShipInventoryOrderFormBody
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
      <ShipInventoryOrderFormBody
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

export default ShipInventoryOrderForm;
