import { ReceiveInventoryOrderFragment } from '../../../../../graphql/generated/.graphql';
import { getMaterialUnitOptions } from '../../../../inventoryActions/utils';
import { YesOrNo } from '../../../../../utils/share';
import InventoryMovementReceiveFormBody from './FormBody';

interface InventoryMovementReceiveFormProps {
  receiveInventoryOrder: ReceiveInventoryOrderFragment | null;
  closeModal: VoidFunction;
  open: boolean;
}

function InventoryMovementReceiveForm({
  receiveInventoryOrder,
  closeModal,
  open,
}: InventoryMovementReceiveFormProps) {
  if (!receiveInventoryOrder) return null;

  return (
    <InventoryMovementReceiveFormBody
      defaultValues={{
        items: receiveInventoryOrder.items
          .filter((item) => !item.removedAt)
          .map((item) => ({
            itemId: item.id,
            quantity: 0,
            targetReceivedQuantity: item.targetReceivedQuantity,
            receivedQuantity: item.receivedQuantity,
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
            inspectionResult: item.requireInspection
              ? YesOrNo.YES
              : YesOrNo.NULL,
            removedAt: item.removedAt || '',
          })),
      }}
      orderKey={receiveInventoryOrder.key}
      createdBy={receiveInventoryOrder.createdBy}
      createdAt={receiveInventoryOrder.createdAt}
      description={receiveInventoryOrder.description}
      closeModal={closeModal}
      open={open}
    />
  );
}

export default InventoryMovementReceiveForm;
