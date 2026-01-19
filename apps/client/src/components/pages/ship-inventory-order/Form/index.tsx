import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { FormWrapper } from '../../../fields/FormWrapper';
import ShipInventoryOrderFormBody from './FormBody';
import { formSchema } from './schema';
import { FormValues } from './typing';

interface ShipInventoryOrderFormProps {
  onSubmit: (values: FormValues) => Promise<void>;
  title: string;
  breadcrumbTitle: string;
  submitText: string;
}

function ShipInventoryOrderForm({
  onSubmit,
  title,
  breadcrumbTitle,
  submitText,
}: ShipInventoryOrderFormProps) {
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
      <ShipInventoryOrderFormBody
        onSubmit={onSubmit}
        title={title}
        breadcrumbTitle={breadcrumbTitle}
      />
    </FormWrapper>
  );
}

export default ShipInventoryOrderForm;
