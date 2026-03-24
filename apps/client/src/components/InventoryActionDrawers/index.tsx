import { useEffect, useMemo } from 'react';
import { InventoryActions } from '../inventoryActions/utils';
import { useInventoryActions } from '../inventoryActions/useInventoryActions';
import { useLazyQueryInventoryList } from '../inventoryActions/useApi';
import CreateTransferInventory from './CreateTransferInventory';
import HoldInventory from './HoldInventory';
import ReleaseInventoryHold from './ReleaseInventoryHold';
import AllocateInventory from './AllocateInventory';
import DeallocateInventory from './DeallocateInventory';
import ShipInventory from './ShipInventory';
import SplitBatch from './SplitBatch';
import MergeBatch from './MergeBatch';
import ReclassifyInventory from './ReclassifyInventory';
import TransferToVendor from './TransferToVendor';
import ReturnFromVendor from './ReturnFromVendor';
import DeliverToCustomer from './DeliverToCustomer';
import ReturnFromCustomer from './ReturnFromCustomer';
import ScrapInventory from './ScrapInventory';

interface InventoryActionDrawersProps {
  onClose: VoidFunction;
  open: boolean;
}

const InventoryActionDrawers: FC<InventoryActionDrawersProps> = ({
  onClose,
  open,
}) => {
  const {
    fetchInventoryList,
    data,
    loading: queryInventoryListLoading,
  } = useLazyQueryInventoryList();
  const { targetInventoryIds, targetAction, resetAll } = useInventoryActions();

  useEffect(() => {
    if (open) {
      if (targetInventoryIds.length > 0) {
        fetchInventoryList({
          variables: {
            ids: targetInventoryIds,
          },
        });
      } else {
        onClose();
        resetAll();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchInventoryList, open, targetInventoryIds, resetAll]);

  const inventoryList = useMemo(
    () => data?.aggregatedStocks.items ?? [],
    [data?.aggregatedStocks.items],
  );

  const baseProps = useMemo(
    () => ({
      inventoryList,
      queryInventoryListLoading,
      onClose,
      open,
    }),
    [inventoryList, onClose, open, queryInventoryListLoading],
  );

  switch (targetAction?.id) {
    case InventoryActions.CreateTransferInventory:
      return <CreateTransferInventory {...baseProps} />;

    case InventoryActions.HoldInventory:
      return <HoldInventory {...baseProps} />;

    case InventoryActions.ReleaseInventoryHold:
      return <ReleaseInventoryHold {...baseProps} />;

    case InventoryActions.AllocateInventory:
      return <AllocateInventory {...baseProps} />;

    case InventoryActions.DeallocateInventory:
      return <DeallocateInventory {...baseProps} />;

    case InventoryActions.ShipInventory:
      return <ShipInventory {...baseProps} />;

    case InventoryActions.SplitBatch:
      return <SplitBatch {...baseProps} />;

    case InventoryActions.MergeBatch:
      return <MergeBatch {...baseProps} />;

    case InventoryActions.ReclassifyInventory:
      return <ReclassifyInventory {...baseProps} />;

    case InventoryActions.TransferToVendor:
      return <TransferToVendor {...baseProps} />;

    case InventoryActions.ReturnFromVendor:
      return <ReturnFromVendor {...baseProps} />;

    case InventoryActions.DeliverToCustomer:
      return <DeliverToCustomer {...baseProps} />;

    case InventoryActions.ReturnFromCustomer:
      return <ReturnFromCustomer {...baseProps} />;

    case InventoryActions.ScrapInventory:
      return <ScrapInventory {...baseProps} />;

    default:
      return null;
  }
};

export default InventoryActionDrawers;
