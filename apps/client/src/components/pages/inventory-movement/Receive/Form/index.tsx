import { ReceiveInventoryOrderFragment } from '../../../../../graphql/generated/.graphql';
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
            serialId: item.serialId,
            material: {
              id: item.material.id,
              name: item.material.key,
            },
            materialDescription: item.material.description,
            targetReceivedQuantity: item.targetReceivedQuantity,
            receivedQuantity: item.receivedQuantity,
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
