import { AggregatedStockFragment } from '../../graphql/generated/.graphql';
import { InventoryActions } from '../../utils/inventoryActions';
import HoldInventory from './HoldInventory';
import ReleaseHoldInventory from './ReleaseHoldInventory';
import MergeBatch from './MergeBatch';
import ScrapInventory from './ScrapInventory';
import { useInventoryActions } from '../inventoryActions/useInventoryActions';

interface InventoryActionDrawersProps {
  targetStocks: AggregatedStockFragment[];
  onClose: VoidFunction;
  open: boolean;
}

const InventoryActionDrawers: FC<InventoryActionDrawersProps> = ({
  targetStocks,
  onClose,
  open,
}) => {
  const { targetAction } = useInventoryActions();

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

    case InventoryActions.ReleaseInventoryHold:
      return (
        <ReleaseHoldInventory
          targetStocks={targetStocks}
          onClose={onClose}
          open={open}
          headerTitle={targetAction.title}
          bottomPrimaryActionText={targetAction.submitText}
          bottomPrimaryActionIcon={targetAction.icon}
        />
      );

    case InventoryActions.MergeBatch:
      return (
        <MergeBatch
          targetStocks={targetStocks}
          onClose={onClose}
          open={open}
          headerTitle={targetAction.title}
          bottomPrimaryActionText={targetAction.submitText}
          bottomPrimaryActionIcon={targetAction.icon}
        />
      );

    case InventoryActions.ScrapInventory:
      return (
        <ScrapInventory
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
