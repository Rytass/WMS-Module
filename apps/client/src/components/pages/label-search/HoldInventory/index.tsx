import { useForm } from 'react-hook-form';
import { AggregatedStockFragment } from '../../../../graphql/generated/.graphql';
import { FormWrapper } from '../../../fields/FormWrapper';
import { useInventoryActions } from '../../../inventoryActions/useInventoryActions';
import { useHoldInventory } from '../../../inventoryActions/useApi';
import { useClearAll } from '../hooks';
import LabelSearchPage from '../Page';

interface HoldInventoryProps {
  inventoryList: AggregatedStockFragment[];
  queryInventoryListLoading: boolean;
  submitText: string;
}

function HoldInventory({
  inventoryList,
  queryInventoryListLoading,
  submitText,
}: HoldInventoryProps) {
  const methods = useForm();
  const { targetAction, errorSignature, inventorySignature, resetAll } =
    useInventoryActions();
  const { holdInventory } = useHoldInventory();
  const onClearAll = useClearAll();

  return (
    <FormWrapper
      methods={methods}
      havePageFooter
      submitText={submitText}
      haveCancelButton={false}
      supportingActionName="重置全部"
      supportingActionOnClick={onClearAll}
    >
      <LabelSearchPage
        inventoryList={inventoryList}
        queryInventoryListLoading={queryInventoryListLoading}
      />
    </FormWrapper>
  );
}

export default HoldInventory;
