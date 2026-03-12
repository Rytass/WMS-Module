import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { Message } from '@mezzanine-ui/react';
import Loading from '../../../Loading';
import ShipInventoryOrderForm from '../Form';
import { FormValues } from '../Form/typing';
import { useQueryShipInventoryOrder } from '../useApi';
import { fragmentToDefaultValues } from '../Form/utils';

function EditShipInventoryOrder() {
  const { query } = useRouter();
  const id = useMemo(() => (query?.id as string) ?? '', [query.id]);

  const { data, loading } = useQueryShipInventoryOrder(id);

  const shipInventoryOrder = useMemo(
    () => data?.shipInventoryOrder ?? null,
    [data?.shipInventoryOrder],
  );

  const onSubmit = useCallback(async (values: FormValues) => {
    console.log('values', values);
  }, []);

  const defaultValues = useMemo(
    (): FormValues => fragmentToDefaultValues(shipInventoryOrder),
    [shipInventoryOrder],
  );

  if (loading) {
    return <Loading />;
  }

  if (!shipInventoryOrder) {
    return null;
  }

  return (
    <ShipInventoryOrderForm
      defaultValues={defaultValues}
      onSubmit={onSubmit}
      title={`出庫單號：${shipInventoryOrder.key}`}
      breadcrumbTitle={shipInventoryOrder.key}
      description={shipInventoryOrder.description}
      createdBy={shipInventoryOrder.createdBy ?? ''}
      createdAt={shipInventoryOrder.createdAt}
      status={shipInventoryOrder.status}
      submitText="儲存"
      viewMode={false}
    />
  );
}

export default EditShipInventoryOrder;
