import { useForm } from 'react-hook-form';
import PageWrapper from '../../PageWrapper';
import { FormWrapper } from '../../fields/FormWrapper';
import { InputField } from '../../fields/InputField';
import { Button } from '@mezzanine-ui/react';

function ShipInventoryOrder() {
  const methods = useForm();

  return (
    <PageWrapper title="出庫單">
      <FormWrapper
        methods={methods}
        onSubmit={(values) => {
          console.log('values', values);
        }}
      >
        <InputField name="description" label="備註" />
        <Button type="submit" size="sub">
          查詢
        </Button>
      </FormWrapper>
    </PageWrapper>
  );
}

export default ShipInventoryOrder;
