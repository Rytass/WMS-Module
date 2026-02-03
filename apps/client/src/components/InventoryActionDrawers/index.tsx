import {
  InventoryActions,
  InventoryActionItem,
} from '../../utils/inventoryActions';
import HoldInventory from './HoldInventory';

interface InventoryActionDrawersProps {
  targetAction: InventoryActionItem | null;
  onClose: VoidFunction;
  open: boolean;
}

const InventoryActionDrawers: FC<InventoryActionDrawersProps> = ({
  targetAction,
  onClose,
  open,
}) => {
  switch (targetAction?.id) {
    case InventoryActions.HoldInventory:
      return (
        <HoldInventory
          onClose={onClose}
          open={open}
          headerTitle={targetAction.title}
          bottomPrimaryActionText={targetAction.submitText}
          bottomPrimaryActionIcon={targetAction.icon}
        />
      );

    default:
      return null;
  }
};

export default InventoryActionDrawers;
