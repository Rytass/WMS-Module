import { useCallback, useEffect, useMemo } from 'react';
import {
  InventoryActionItem,
  InventoryActions,
} from '../../utils/inventoryActions';
import HoldInventory from './HoldInventory';
import MergeBatch from './MergeBatch';
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

  const baseProps = useCallback(
    (currentTargetAction: InventoryActionItem) => ({
      inventoryList,
      queryInventoryListLoading,
      onClose,
      open,
      headerTitle: currentTargetAction.title,
      bottomPrimaryActionText: currentTargetAction.submitText,
      bottomPrimaryActionIcon: currentTargetAction.icon,
    }),
    [inventoryList, onClose, open, queryInventoryListLoading],
  );

  switch (targetAction?.id) {
    case InventoryActions.HoldInventory:
      return <HoldInventory {...baseProps(targetAction)} />;

    case InventoryActions.MergeBatch:
      return <MergeBatch {...baseProps(targetAction)} />;

    default:
      return null;
  }
};

export default InventoryActionDrawers;
