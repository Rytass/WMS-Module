import {
  StockInActionsFragment,
  ShipInventoryOrderReferenceFragment,
} from '../../../graphql/generated/.graphql';

export function matchInventoryToReference({
  inventory,
  reference,
}: {
  inventory: StockInActionsFragment;
  reference: ShipInventoryOrderReferenceFragment;
}) {
  let condition = reference.material.key === inventory.material.key;

  if (reference.batch) {
    condition = condition && reference.batch.key === inventory.batch.key;
  }

  if (reference.saleId) {
    condition = condition && reference.saleId === inventory.saleId;
  }

  if (reference.saleSerialId) {
    condition = condition && reference.saleSerialId === inventory.saleSerialId;
  }

  return condition;
}
