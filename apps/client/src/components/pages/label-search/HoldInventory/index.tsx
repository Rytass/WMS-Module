import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { IconDefinition } from '@mezzanine-ui/icons';
import { AggregatedStockFragment } from '../../../../graphql/generated/.graphql';
import { FormWrapper } from '../../../fields/FormWrapper';
import { useInventoryActions } from '../../../inventoryActions/useInventoryActions';
import { useHoldInventory } from '../../../inventoryActions/useApi';
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

  return (
    <FormWrapper
      methods={methods}
      havePageFooter
      submitText={submitText}
      haveCancelButton={false}
      supportingActionName="重置全部"
      supportingActionOnClick={() => {
        console.log('重置全部');
      }}
    >
      <LabelSearchPage
        inventoryList={inventoryList}
        queryInventoryListLoading={queryInventoryListLoading}
      />
    </FormWrapper>
  );
}

export default HoldInventory;
