import { ShipInventoryOrderFragment } from '../../../../graphql/generated/.graphql';
import { BASE_UNIT } from '../../../../utils/share';
import { FormValues } from './typing';

export function fragmentToDefaultValues(
  shipInventoryOrder: ShipInventoryOrderFragment | null,
): FormValues {
  return {
    remark: shipInventoryOrder?.description,
    references: [],
  };
}
