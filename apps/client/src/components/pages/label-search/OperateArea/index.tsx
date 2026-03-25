import { useMemo } from 'react';
import { useInventoryActions } from '../../../inventoryActions/useInventoryActions';
import { InventoryActions } from '../../../inventoryActions/utils';
import { useQueryInventoryList } from '../../../inventoryActions/useApi';
import HostSection from './HostSection';
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
import QualityInspection from './QualityInspection';
import ScrapInventory from './ScrapInventory';

const OperateArea: FC = () => {
  const { targetAction, targetInventoryIds } = useInventoryActions();

  const { data, loading: queryInventoryListLoading } =
    useQueryInventoryList(targetInventoryIds);

  const inventoryList = useMemo(
    () => data?.aggregatedStocks.items ?? [],
    [data?.aggregatedStocks.items],
  );

  const baseProps = useMemo(
    () => ({
      inventoryList,
      queryInventoryListLoading,
    }),
    [inventoryList, queryInventoryListLoading],
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

    case InventoryActions.QualityInspection:
      return <QualityInspection {...baseProps} />;

    case InventoryActions.ScrapInventory:
      return <ScrapInventory {...baseProps} />;

    default:
      return <HostSection {...baseProps} />;
  }
};

export default OperateArea;
