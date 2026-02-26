import { useMemo } from 'react';
import { useInventoryActions } from '../../../inventoryActions/useInventoryActions';
import { InventoryActions } from '../../../inventoryActions/utils';
import { useQueryInventoryList } from '../../../inventoryActions/useApi';
import HostSection from './HostSection';
import HoldInventory from './HoldInventory';
import ReleaseHoldInventory from './ReleaseHoldInventory';
import MergeBatch from './MergeBatch';
import ScrapInventory from './ScrapInventory';

const OperateArea: FC = () => {
  const { targetAction, targetInventoryIds } = useInventoryActions();

  const { data, loading: queryInventoryListLoading } =
    useQueryInventoryList(targetInventoryIds);

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
        />
      );

    case InventoryActions.ReleaseInventoryHold:
      return (
        <ReleaseHoldInventory
          inventoryList={inventoryList}
          queryInventoryListLoading={queryInventoryListLoading}
        />
      );

    case InventoryActions.MergeBatch:
      return (
        <MergeBatch
          inventoryList={inventoryList}
          queryInventoryListLoading={queryInventoryListLoading}
        />
      );

    case InventoryActions.ScrapInventory:
      return (
        <ScrapInventory
          inventoryList={inventoryList}
          queryInventoryListLoading={queryInventoryListLoading}
        />
      );

    default:
      return (
        <HostSection
          inventoryList={inventoryList}
          queryInventoryListLoading={queryInventoryListLoading}
        />
      );
  }
};

export default OperateArea;
