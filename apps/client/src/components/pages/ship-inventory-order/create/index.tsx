import { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { FormWrapper } from '../../../fields/FormWrapper';
import CreateShipInventoryOrderForm from './Form';
import { FormValues } from './typing';

function CreateShipInventoryOrder() {
  const methods = useForm<FormValues>({
    defaultValues: {
      demo: '',
    },
  });

  const onSubmit = useCallback(async (values: FormValues) => {
    console.log('values', values);
  }, []);

  return (
    <FormWrapper
      methods={methods}
      havePageFooter
      submitText="建立"
      onSubmit={onSubmit}
    >
      <CreateShipInventoryOrderForm onSubmit={onSubmit} />
    </FormWrapper>
  );
}

export default CreateShipInventoryOrder;
