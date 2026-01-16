import { useForm } from 'react-hook-form';
import { FormWrapper } from '../../../fields/FormWrapper';
import CreateShipInventoryOrderForm from './Form';

function CreateShipInventoryOrder() {
  const methods = useForm();

  return (
    <FormWrapper methods={methods} havePageFooter submitText="建立">
      <CreateShipInventoryOrderForm />
    </FormWrapper>
  );
}

export default CreateShipInventoryOrder;
