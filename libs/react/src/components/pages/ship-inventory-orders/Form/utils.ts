import { ShipInventoryOrderFragment } from '../../../../graphql/generated/.graphql';
import { BASE_UNIT } from '../../../../utils/share';
import { getMaterialUnitOptions } from '../../../inventoryActions/utils';
import { FormValues } from './typing';

export function fragmentToDefaultValues(
  shipInventoryOrder: ShipInventoryOrderFragment | null,
): FormValues {
  return {
    remark: shipInventoryOrder?.description,
    references: (shipInventoryOrder?.references ?? []).map((r) => ({
      material: {
        id: r.material.id,
        name: r.material.key,
      },
      description: r.material.description,
      batch: r.batch
        ? {
            id: r.batch.id,
            name: r.batch.key,
          }
        : null,
      quantity: r.targetShippedQuantity,
      unit: r.unitId || BASE_UNIT,
      saleId: r.saleId ? { id: r.saleId, name: r.saleId } : null,
      saleSerialId: r.saleSerialId
        ? { id: r.saleSerialId, name: r.saleSerialId }
        : null,

      itemId: r.id,
      serialId: r.serialId,
      shippedQuantity: r.shippedQuantity,
      unitOptions: getMaterialUnitOptions(r.material),
      isExisted: true,
      removedAt: r.removedAt || '',
    })),
  };
}
