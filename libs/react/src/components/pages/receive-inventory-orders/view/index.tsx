import { useMemo } from 'react';
import { useWmsRouter } from '../../../../router/context';
import Loading from '../../../Loading';
import ReceiveInventoryOrderForm from '../Form';
import { FormValues } from '../Form/typing';
import { useQueryReceiveInventoryOrder } from '../useApi';
import { fragmentToDefaultValues } from '../Form/utils';

function ViewReceiveInventoryOrder() {
  const { params } = useWmsRouter();
  const id = useMemo(() => (params?.id as string) ?? '', [params.id]);

  const { data, loading } = useQueryReceiveInventoryOrder(id);

  const receiveInventoryOrder = useMemo(
    () => data?.receiveInventoryOrder ?? null,
    [data?.receiveInventoryOrder],
  );

  const defaultValues = useMemo(
    (): FormValues => fragmentToDefaultValues(receiveInventoryOrder),
    [receiveInventoryOrder],
  );

  if (loading) {
    return <Loading />;
  }

  if (!receiveInventoryOrder) {
    return null;
  }

  return (
    <ReceiveInventoryOrderForm
      defaultValues={defaultValues}
      title={`入庫單號：${receiveInventoryOrder.key}`}
      breadcrumbTitle={receiveInventoryOrder.key}
      description={receiveInventoryOrder.description}
      createdBy={receiveInventoryOrder.createdBy ?? ''}
      createdAt={receiveInventoryOrder.createdAt}
      status={receiveInventoryOrder.status}
      viewMode
    />
  );
}

export default ViewReceiveInventoryOrder;
