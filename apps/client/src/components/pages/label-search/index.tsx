import { useMemo } from 'react';
import { useInventoryActions } from '../../inventoryActions/useInventoryActions';
import { useQueryInventoryList } from '../../inventoryActions/useApi';
import LabelSearchPage from './Page';

function LabelSearch() {
  const { targetInventoryIds } = useInventoryActions();

  const { data, loading: queryInventoryListLoading } =
    useQueryInventoryList(targetInventoryIds);

  const inventoryList = useMemo(
    () => data?.aggregatedStocks.items ?? [],
    [data?.aggregatedStocks.items],
  );

  return (
    <LabelSearchPage
      inventoryList={inventoryList}
      queryInventoryListLoading={queryInventoryListLoading}
    />
  );
}

export default LabelSearch;
