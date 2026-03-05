import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import Loading from '../../../Loading';
import EditReceiveInventoryOrderForm from '../Form';
import { FormValues } from '../Form/typing';
import { useQueryReceiveInventoryOrder } from '../useApi';
import { YesOrNo } from '../../../../utils/share';

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
    (): FormValues => ({
      remark: receiveInventoryOrder?.description,
      items: [],
    }),
    [receiveInventoryOrder],
  );

  console.log('receiveInventoryOrder', receiveInventoryOrder);

  if (loading) {
    return <Loading />;
  }

  if (!receiveInventoryOrder) {
    return null;
  }

  return (
    <EditReceiveInventoryOrderForm
      defaultValues={defaultValues}
      onSubmit={onSubmit}
      title={`入庫單號：${receiveInventoryOrder.key}`}
      breadcrumbTitle={receiveInventoryOrder.key}
      submitText="儲存"
    />
  );
}

export default EditReceiveInventoryOrder;
