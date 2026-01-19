import { useCallback } from 'react';
import CreateShipInventoryOrderForm from '../Form';
import { FormValues } from '../Form/typing';

function CreateShipInventoryOrder() {
  const onSubmit = useCallback(async (values: FormValues) => {
    console.log('values', values);
  }, []);

  return (
    <CreateShipInventoryOrderForm
      onSubmit={onSubmit}
      title="建立出庫單"
      breadcrumbTitle="建立出庫單"
      submitText="建立"
    />
  );
}

export default CreateShipInventoryOrder;
