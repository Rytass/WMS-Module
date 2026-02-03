import { AggregatedStockFragment } from '../../../graphql/generated/.graphql';
import { InventoryFieldItem } from './typing';

export function initInventoryFieldItem(
  fragment: AggregatedStockFragment,
): InventoryFieldItem {
  return {
    stockId: fragment.id,
    materialKey: fragment.material.key,
    batchKey: fragment.batch.key,
    originQuantity: fragment.quantity,
    quantity: fragment.quantity,
    inputQuantity: `${fragment.quantity}`,
    selectedUnit: fragment.material.baseUnit.key,
    units: [
      ...fragment.material.materialUnits.map((u) => ({
        id: u.unit,
        name: u.unit,
        conversionFactor: u.conversionFactor,
      })),
    ],
  };
}
