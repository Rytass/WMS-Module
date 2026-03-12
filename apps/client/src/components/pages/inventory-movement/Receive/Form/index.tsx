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
      defaultValues={{ test: receiveInventoryOrder?.description }}
      closeModal={closeModal}
      open={open}
    />
  );
}

export default InventoryMovementReceiveForm;
