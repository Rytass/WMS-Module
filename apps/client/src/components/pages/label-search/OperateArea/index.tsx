import { useCallback, useMemo } from 'react';
import { useInventoryActions } from '../../../inventoryActions/useInventoryActions';
import {
  InventoryActionItem,
  InventoryActions,
} from '../../../inventoryActions/utils';
import { useQueryInventoryList } from '../../../inventoryActions/useApi';
import HostSection from './HostSection';
import HoldInventory from './HoldInventory';
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

  const baseProps = useCallback(
    (currentTargetAction: InventoryActionItem) => ({
      inventoryList,
      queryInventoryListLoading,
      submitText: currentTargetAction.submitText,
    }),
    [inventoryList, queryInventoryListLoading],
  );

  switch (targetAction?.id) {
    case InventoryActions.HoldInventory:
      return <HoldInventory {...baseProps(targetAction)} />;

    case InventoryActions.MergeBatch:
      return <MergeBatch {...baseProps(targetAction)} />;

    case InventoryActions.ScrapInventory:
      return <ScrapInventory {...baseProps(targetAction)} />;

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
