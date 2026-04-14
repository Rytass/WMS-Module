import { TransferOrderFragment } from '../../../../../graphql/generated/.graphql';
import { getMaterialUnitOptions } from '../../../../inventoryActions/utils';
// import InventoryMovementTransferFormBody from './FormBody';

interface InventoryMovementTransferFormProps {
  transferOrder: TransferOrderFragment | null;
  closeModal: VoidFunction;
  open: boolean;
}

function InventoryMovementTransferForm({
  transferOrder,
  closeModal,
  open,
}: InventoryMovementTransferFormProps) {
  if (!transferOrder) return null;

  return <div>InventoryMovementTransferForm</div>;
}

export default InventoryMovementTransferForm;
