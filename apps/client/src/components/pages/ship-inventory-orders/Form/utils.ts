import { ShipInventoryOrderFragment } from '../../../../graphql/generated/.graphql';
import { BASE_UNIT } from '../../../../utils/share';
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

      itemId: r.id,
      shippedQuantity: r.shippedQuantity,
      unitOptions: [
        {
          id: BASE_UNIT,
          name: r.material.baseUnit.key,
        },
        ...r.material.materialUnits.map((u) => ({
          id: u.id,
          name: u.unit,
        })),
      ],
      isExisted: true,
      // removedAt: r.removedAt || '',
    })),
  };
}
