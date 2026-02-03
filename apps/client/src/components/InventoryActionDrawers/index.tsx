import { AggregatedStockFragment } from '../../graphql/generated/.graphql';
import {
  InventoryActions,
  InventoryActionItem,
} from '../../utils/inventoryActions';
import HoldInventory from './HoldInventory';

interface InventoryActionDrawersProps {
  targetAction: InventoryActionItem | null;
  targetStocks: AggregatedStockFragment[];
  onClose: VoidFunction;
  open: boolean;
}

const InventoryActionDrawers: FC<InventoryActionDrawersProps> = ({
  targetAction,
  targetStocks,
  onClose,
  open,
}) => {
  switch (targetAction?.id) {
    case InventoryActions.HoldInventory:
      return (
        <HoldInventory
          targetStocks={targetStocks}
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
