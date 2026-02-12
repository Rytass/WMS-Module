import { useEffect, useMemo } from 'react';
import { InventoryActions } from '../../utils/inventoryActions';
import HoldInventory from './HoldInventory';
import ReleaseHoldInventory from './ReleaseHoldInventory';
import MergeBatch from './MergeBatch';
import ScrapInventory from './ScrapInventory';
import { useInventoryActions } from '../inventoryActions/useInventoryActions';
import { useQueryInventoryList } from './useApi';

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
  } = useQueryInventoryList();
  const { targetInventoryIds, targetAction } = useInventoryActions();

  useEffect(() => {
    if (open) {
      fetchInventoryList({
        variables: {
          ids: targetInventoryIds,
        },
      });
    }
  }, [fetchInventoryList, open, targetInventoryIds]);

  const inventoryList = useMemo(
    () => data?.aggregatedStocks.items ?? [],
    [data?.aggregatedStocks.items],
  );

  switch (targetAction?.id) {
    case InventoryActions.HoldInventory:
      return (
        <HoldInventory
          inventoryList={inventoryList}
          queryInventoryListLoading={queryInventoryListLoading}
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
