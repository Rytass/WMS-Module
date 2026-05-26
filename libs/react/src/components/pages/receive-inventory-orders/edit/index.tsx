import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { Message } from '@mezzanine-ui/react';
import Loading from '../../../Loading';
import ReceiveInventoryOrderForm from '../Form';
import { FormValues } from '../Form/typing';
import {
  useQueryReceiveInventoryOrder,
  useUpdateReceiveInventoryOrder,
} from '../useApi';
import { fragmentToDefaultValues } from '../Form/utils';
import { YesOrNo, BASE_UNIT } from '../../../../utils/share';

function EditReceiveInventoryOrder() {
  const { query, back } = useRouter();
  const id = useMemo(() => (query?.id as string) ?? '', [query.id]);

  const { data, loading } = useQueryReceiveInventoryOrder(id);
  const { updateReceiveInventoryOrder } = useUpdateReceiveInventoryOrder();

  const receiveInventoryOrder = useMemo(
    () => data?.receiveInventoryOrder ?? null,
    [data?.receiveInventoryOrder],
  );

  const onSubmit = useCallback(
    async (values: FormValues) => {
      try {
        const { data } = await updateReceiveInventoryOrder({
          variables: {
            updateReceiveInventoryOrderId: id,
            description: values.remark ?? '',
            items: values.items.map((item, index) => ({
              id: item.itemId || undefined,
              unitId: item.unit === BASE_UNIT ? null : item.unit,
              serialId: item.serialId || `${(index + 1) * 10}`,
              materialKey: item.material?.name,
              batchKey: item.batch?.name || null,
              locationKey: item.location?.name || null,
              loaderKey: item.loader?.name || null,
              targetReceivedQuantity: item.quantity,
              requireInspection: item.inspection === YesOrNo.YES,
              removedAt: item.removedAt || null,
            })),
          },
        });

        if (data?.updateReceiveInventoryOrder.id) {
          Message.success('儲存成功');
          back();
        }
      } catch (error) {
        console.error(error);
      }
    },
    [id, back, updateReceiveInventoryOrder],
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
