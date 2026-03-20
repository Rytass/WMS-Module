import { ReceiveInventoryOrderFragment } from '../../../../graphql/generated/.graphql';
import { YesOrNo, BASE_UNIT } from '../../../../utils/share';
import { FormValues } from './typing';

export function fragmentToDefaultValues(
  receiveInventoryOrder: ReceiveInventoryOrderFragment | null,
): FormValues {
  return {
    remark: receiveInventoryOrder?.description ?? '',
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
      serialId: item.serialId,
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
      removedAt: item.removedAt || '',
    })),
  };
}
