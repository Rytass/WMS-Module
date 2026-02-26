import { useEffect, useMemo } from 'react';
import { InventoryActions } from '../inventoryActions/utils';
import HoldInventory from './HoldInventory';
import MergeBatch from './MergeBatch';
import ScrapInventory from './ScrapInventory';
import { useInventoryActions } from '../inventoryActions/useInventoryActions';
import { useLazyQueryInventoryList } from '../inventoryActions/useApi';

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
    case InventoryActions.HoldInventory:
      return <HoldInventory {...baseProps} />;

    case InventoryActions.MergeBatch:
      return <MergeBatch {...baseProps} />;

    case InventoryActions.ScrapInventory:
      return <ScrapInventory {...baseProps} />;

    default:
      return null;
  }
};

export default InventoryActionDrawers;
