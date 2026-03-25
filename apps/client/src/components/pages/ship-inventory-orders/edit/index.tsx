import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { Message } from '@mezzanine-ui/react';
import Loading from '../../../Loading';
import ShipInventoryOrderForm from '../Form';
import { FormValues } from '../Form/typing';
import {
  useQueryShipInventoryOrder,
  useUpdateShipInventoryOrder,
} from '../useApi';
import { fragmentToDefaultValues } from '../Form/utils';
import { BASE_UNIT } from '../../../../utils/share';

function EditShipInventoryOrder() {
  const { query, back } = useRouter();
  const id = useMemo(() => (query?.id as string) ?? '', [query.id]);

  const { data, loading } = useQueryShipInventoryOrder(id);
  const { updateShipInventoryOrder } = useUpdateShipInventoryOrder();

  const shipInventoryOrder = useMemo(
    () => data?.shipInventoryOrder ?? null,
    [data?.shipInventoryOrder],
  );

  const onSubmit = useCallback(
    async (values: FormValues) => {
      try {
        const { data } = await updateShipInventoryOrder({
          variables: {
            updateShipInventoryOrderId: id,
            description: values.remark ?? '',
            references: values.references.map((reference, index) => ({
              id: reference.itemId || undefined,
              unitId: reference.unit === BASE_UNIT ? null : reference.unit,
              serialId: reference.serialId || `${(index + 1) * 10}`,
              materialKey: reference.material?.name,
              batchKey: reference.batch?.name || null,
              targetShippedQuantity: reference.quantity,
              saleId: reference.saleId?.id || null,
              saleSerialId: reference.saleSerialId?.id || null,
              removedAt: reference.removedAt || null,
            })),
          },
        });

        if (data?.updateShipInventoryOrder.id) {
          Message.success('儲存成功');
          back();
        }
      } catch (error) {
        console.error(error);
      }
    },
    [id, back, updateShipInventoryOrder],
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
