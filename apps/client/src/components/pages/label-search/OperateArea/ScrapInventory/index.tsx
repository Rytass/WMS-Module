import { useForm } from 'react-hook-form';
import { AggregatedStockFragment } from '../../../../../graphql/generated/.graphql';
import { FormWrapper } from '../../../../fields/FormWrapper';
import { useInventoryActions } from '../../../../inventoryActions/useInventoryActions';
import { useClearAll } from '../../hooks';
import HostSection from '../HostSection';

interface ScrapInventoryProps {
  inventoryList: AggregatedStockFragment[];
  queryInventoryListLoading: boolean;
  submitText: string;
}

function ScrapInventory({
  inventoryList,
  queryInventoryListLoading,
  submitText,
}: ScrapInventoryProps) {
  const methods = useForm();
  const { targetAction, errorSignature, inventorySignature, resetAll } =
    useInventoryActions();
  const onClearAll = useClearAll();

  return (
    <FormWrapper
      methods={methods}
      havePageFooter
      submitText={submitText}
      primaryButtonVariant="destructive-primary"
      haveCancelButton={false}
      supportingActionName="重置全部"
      supportingActionOnClick={onClearAll}
    >
      <HostSection
        inventoryList={inventoryList}
        queryInventoryListLoading={queryInventoryListLoading}
      />
    </FormWrapper>
  );
}

export default ScrapInventory;
