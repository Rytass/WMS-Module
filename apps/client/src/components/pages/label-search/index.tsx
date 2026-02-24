import { useMemo, useCallback } from 'react';
import {
  InventoryActionItem,
  InventoryActions,
} from '../../../utils/inventoryActions';
import { useInventoryActions } from '../../inventoryActions/useInventoryActions';
import { useQueryInventoryList } from '../../inventoryActions/useApi';
import LabelSearchPage from './Page';
import HoldInventory from './HoldInventory';

function LabelSearch() {
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

    default:
      return (
        <LabelSearchPage
          inventoryList={inventoryList}
          queryInventoryListLoading={queryInventoryListLoading}
        />
      );
  }
}

export default LabelSearch;
