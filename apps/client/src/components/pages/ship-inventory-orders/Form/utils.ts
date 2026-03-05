import { ShipInventoryOrderFragment } from '../../../../graphql/generated/.graphql';
import { YesOrNo, BASE_UNIT } from '../../../../utils/share';
import { FormValues } from './typing';

export function fragmentToDefaultValues(
  shipInventoryOrder: ShipInventoryOrderFragment | null,
): FormValues {
  return {
    remark: shipInventoryOrder?.description,
    items: [],
  };
}
