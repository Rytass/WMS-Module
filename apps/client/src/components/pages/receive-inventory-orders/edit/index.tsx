import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import Loading from '../../../Loading';
import EditReceiveInventoryOrderForm from '../Form';
import { FormValues } from '../Form/typing';
import { useQueryReceiveInventoryOrder } from '../useApi';
import { YesOrNo, BASE_UNIT } from '../../../../utils/share';

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
      items: (receiveInventoryOrder?.items ?? []).map((item) => ({
        inspection: item.requireInspection ? YesOrNo.YES : YesOrNo.NO,
        material: {
          id: item.material.id,
          name: item.material.key,
        },
        description: item.material.description,
        batch: item.batch
          ? {
              id: item.batch.id,
              name: item.batch.key,
            }
          : null,
        location: item.location
          ? {
              id: item.location.id,
              name: item.location.key,
            }
          : null,

        loader: item.loader
          ? {
              id: item.loader.id,
              name: item.loader.serialId,
            }
          : null,
        quantity: item.targetReceivedQuantity,
        unit: item.unitId || BASE_UNIT,

        itemId: item.id,
        receivedQuantity: item.receivedQuantity,
        unitOptions: [
          {
            id: BASE_UNIT,
            name: item.material.baseUnit.key,
          },
          ...item.material.materialUnits.map((u) => ({
            id: u.id,
            name: u.unit,
          })),
        ],
        isExisted: true,
        removedAt: item.removedAt,
      })),
    }),
    [receiveInventoryOrder],
  );

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
      createdBy={receiveInventoryOrder.createdBy ?? ''}
      createdAt="今天"
      status={receiveInventoryOrder.status}
      submitText="儲存"
    />
  );
}

export default EditReceiveInventoryOrder;
