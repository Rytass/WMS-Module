import { useForm } from 'react-hook-form';
import PageWrapper from '../../PageWrapper';
// import { FormWrapper } from '../../fields/FormWrapper';
// import { InputField } from '../../fields/InputField';
import { FormFieldSize, formFieldClasses } from '@mezzanine-ui/core/form';

import { inputClasses } from '@mezzanine-ui/core/input';
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
        <Input placeholder="Enter username" size="main" />
      </FormField>
    </PageWrapper>
  );
}

export default ShipInventoryOrder;
