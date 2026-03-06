import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import Loading from '../../../Loading';
import ReceiveInventoryOrderForm from '../Form';
import { FormValues } from '../Form/typing';
import { useQueryReceiveInventoryOrder } from '../useApi';
import { fragmentToDefaultValues } from '../Form/utils';

function EditReceiveInventoryOrder() {
  const { query } = useRouter();
  const id = useMemo(() => (query?.id as string) ?? '', [query.id]);

  const { data, loading } = useQueryReceiveInventoryOrder(id);

  const receiveInventoryOrder = useMemo(
    () => data?.receiveInventoryOrder ?? null,
    [data?.receiveInventoryOrder],
  );

  const onSubmit = useCallback(async (values: FormValues) => {
    console.log('values', values);
  }, []);

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
      onSubmit={onSubmit}
      title={`入庫單號：${receiveInventoryOrder.key}`}
      breadcrumbTitle={receiveInventoryOrder.key}
      description={receiveInventoryOrder.description}
      createdBy={receiveInventoryOrder.createdBy ?? ''}
      createdAt={receiveInventoryOrder.createdAt}
      status={receiveInventoryOrder.status}
      submitText="儲存"
      viewMode={false}
    />
  );
}

export default EditReceiveInventoryOrder;
