import { useMemo } from 'react';
import { useInventoryActions } from '../../../inventoryActions/useInventoryActions';
import { InventoryActions } from '../../../inventoryActions/utils';
import { useQueryInventoryList } from '../../../inventoryActions/useApi';
import HostSection from './HostSection';
import HoldInventory from './HoldInventory';
import ReleaseInventoryHold from './ReleaseInventoryHold';
import DeallocateInventory from './DeallocateInventory';
import SplitBatch from './SplitBatch';
import MergeBatch from './MergeBatch';
import ReturnFromVendor from './ReturnFromVendor';
import ReturnFromCustomer from './ReturnFromCustomer';
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
        <ReleaseInventoryHold
          inventoryList={inventoryList}
          queryInventoryListLoading={queryInventoryListLoading}
        />
      );

    case InventoryActions.DeallocateInventory:
      return (
        <DeallocateInventory
          inventoryList={inventoryList}
          queryInventoryListLoading={queryInventoryListLoading}
        />
      );

    case InventoryActions.SplitBatch:
      return (
        <SplitBatch
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

    case InventoryActions.ReturnFromVendor:
      return (
        <ReturnFromVendor
          inventoryList={inventoryList}
          queryInventoryListLoading={queryInventoryListLoading}
        />
      );

    case InventoryActions.ReturnFromCustomer:
      return (
        <ReturnFromCustomer
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
