import { useMemo } from 'react';
import { useWmsRouter } from '../../../../router/context';
import Loading from '../../../Loading';
import TransferOrderForm from './Form';
import { useQueryTransferOrder } from '../useApi';
import { BASE_UNIT } from '../../../../utils/share';
import { getMaterialUnitOptions } from '../../../inventoryActions/utils';

function EditTransferOrder() {
  const { params } = useWmsRouter();
  const id = useMemo(() => (params?.id as string) ?? '', [params.id]);

  const { data, loading } = useQueryTransferOrder(id);

  const transferOrder = useMemo(
    () => data?.transferOrder ?? null,
    [data?.transferOrder],
  );

  if (loading) {
    return <Loading />;
  }

  if (!transferOrder) {
    return null;
  }

  return (
    <TransferOrderForm
      orderId={id}
      defaultValues={{
        targetLocation: transferOrder.targetLocation
          ? {
              id: transferOrder.targetLocation.id,
              name: transferOrder.targetLocation.key,
            }
          : null,
        targetLoader: transferOrder.targetLoader
          ? {
              id: transferOrder.targetLoader.id,
              name: transferOrder.targetLoader.serialId,
            }
          : null,
        description: transferOrder.description || '',
        items: transferOrder.items.map((item) => ({
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
          unit: item.unitId || BASE_UNIT,
          saleId: item.saleId ? { id: item.saleId, name: item.saleId } : null,
          saleSerialId: item.saleSerialId
            ? { id: item.saleSerialId, name: item.saleSerialId }
            : null,

          itemId: item.id,
          newQuantity: item.targetTransferredQuantity,
          maxOriginQuantity: (() => {
            const unitOptions = getMaterialUnitOptions(item.material);
            const unit = item.unitId || BASE_UNIT;
            const conversionFactor =
              unitOptions.find((o) => o.id === unit)?.conversionFactor ?? 1;

            return item.targetTransferredQuantity * conversionFactor;
          })(),
          transferredQuantity: item.transferredQuantity,
          unitOptions: getMaterialUnitOptions(item.material),
          isExisted: true,
          removedAt: item.removedAt || '',
        })),
      }}
      title={`出庫單號：${transferOrder.key}`}
      breadcrumbTitle={transferOrder.key}
      createdBy={transferOrder.createdBy}
      receiver={transferOrder.receiver}
      createdAt={transferOrder.createdAt}
    />
  );
}

export default EditTransferOrder;
