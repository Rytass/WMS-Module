import { ShipInventoryOrderFragment } from '../../../../../graphql/generated/.graphql';
import { getMaterialUnitOptions } from '../../../../inventoryActions/utils';
import InventoryMovementShipFormBody from './FormBody';

interface InventoryMovementShipFormProps {
  shipInventoryOrder: ShipInventoryOrderFragment | null;
  closeModal: VoidFunction;
  open: boolean;
}

function InventoryMovementShipForm({
  shipInventoryOrder,
  closeModal,
  open,
}: InventoryMovementShipFormProps) {
  if (!shipInventoryOrder) return null;

  return (
    <InventoryMovementShipFormBody
      defaultValues={{
        items: shipInventoryOrder.items
          .filter((item) => !item.removedAt)
          .map((item) => ({
            itemId: item.id,
            quantity: 0,
            targetShippedQuantity: item.targetShippedQuantity,
            shippedQuantity: item.shippedQuantity,
            serialId: item.serialId,
            unitId: item.unitId,
            unitOptions: getMaterialUnitOptions(item.material),
            material: {
              id: item.material.id,
              name: item.material.key,
            },
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
            materialDescription: item.material.description,
            saleId: item.saleId
              ? {
                  id: item.saleId,
                  name: item.saleId,
                }
              : null,
            saleSerialId: item.saleSerialId
              ? {
                  id: item.saleSerialId,
                  name: item.saleSerialId,
                }
              : null,
            removedAt: item.removedAt || '',
          })),
      }}
      orderKey={shipInventoryOrder.key}
      createdBy={shipInventoryOrder.createdBy}
      createdAt={shipInventoryOrder.createdAt}
      description={shipInventoryOrder.description}
      closeModal={closeModal}
      open={open}
    />
  );
}

export default InventoryMovementShipForm;
