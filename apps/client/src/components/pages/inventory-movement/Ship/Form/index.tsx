import { ShipInventoryOrderFragment } from '../../../../../graphql/generated/.graphql';
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
      defaultValues={{ test: shipInventoryOrder?.id }}
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
