import { useMemo } from 'react';
import { useWmsRouter } from '../../../../router/context';
import Loading from '../../../Loading';
import ShipInventoryOrderForm from '../Form';
import { FormValues } from '../Form/typing';
import { useQueryShipInventoryOrder } from '../useApi';
import { fragmentToDefaultValues } from '../Form/utils';

function ViewShipInventoryOrder() {
  const { params } = useWmsRouter();
  const id = useMemo(() => (params?.id as string) ?? '', [params.id]);

  const { data, loading } = useQueryShipInventoryOrder(id);

  const shipInventoryOrder = useMemo(
    () => data?.shipInventoryOrder ?? null,
    [data?.shipInventoryOrder],
  );

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
      title={`出庫單號：${shipInventoryOrder.key}`}
      breadcrumbTitle={shipInventoryOrder.key}
      description={shipInventoryOrder.description}
      createdBy={shipInventoryOrder.createdBy ?? ''}
      createdAt={shipInventoryOrder.createdAt}
      status={shipInventoryOrder.status}
      viewMode
    />
  );
}

export default ViewShipInventoryOrder;
