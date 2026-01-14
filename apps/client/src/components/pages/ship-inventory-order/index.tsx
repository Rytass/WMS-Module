import { useForm } from 'react-hook-form';
import PageWrapper from '../../PageWrapper';
// import { FormWrapper } from '../../fields/FormWrapper';
// import { InputField } from '../../fields/InputField';
import { FormFieldSize } from '@mezzanine-ui/core/form';
import Input from '@mezzanine-ui/react/Input';
import FormField from '@mezzanine-ui/react/Form/FormField';

function ShipInventoryOrder() {
  const methods = useForm();

  return (
    <PageWrapper title="出庫單">
      <FormField
        hintText="Label and input on the same row with base spacing"
        label="Username"
        name="username-h-base"
        size={FormFieldSize.VERTICAL}
      >
        <Input placeholder="Enter username" />
      </FormField>
    </PageWrapper>
  );
}

export default ShipInventoryOrder;
