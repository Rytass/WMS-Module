import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import EditShipInventoryOrderForm from '../Form';
import { FormValues } from '../Form/typing';

function EditShipInventoryOrder() {
  const { query } = useRouter();
  const id = useMemo(() => (query?.id as string) ?? '', [query.id]);

  const onSubmit = useCallback(async (values: FormValues) => {
    console.log('values', values);
  }, []);

  return (
    <EditShipInventoryOrderForm
      onSubmit={onSubmit}
      title={`出庫單號：${id}`}
      breadcrumbTitle={id}
      submitText="儲存"
    />
  );
}

export default EditShipInventoryOrder;
