import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { FormWrapper } from '../../fields/FormWrapper';
import { useInventoryActions } from '../../inventoryActions/useInventoryActions';
import { useQueryInventoryList } from '../../inventoryActions/useApi';
import LabelSearchPage from './Page';

function LabelSearch() {
  const { targetInventoryIds } = useInventoryActions();
  const methods = useForm();

  const { data, loading: queryInventoryListLoading } =
    useQueryInventoryList(targetInventoryIds);

  const inventoryList = useMemo(
    () => data?.aggregatedStocks.items ?? [],
    [data?.aggregatedStocks.items],
  );

  console.log('inventoryList', inventoryList);

  return (
    <FormWrapper
      methods={methods}
      havePageFooter
      submitText="Go"
      haveCancelButton={false}
      supportingActionName="重置全部"
      supportingActionOnClick={() => {
        console.log('重置全部');
      }}
    >
      <LabelSearchPage />
    </FormWrapper>
  );
}

export default LabelSearch;
