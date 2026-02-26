import { useForm } from 'react-hook-form';
import { AggregatedStockFragment } from '../../../../../graphql/generated/.graphql';
import { FormWrapper } from '../../../../fields/FormWrapper';
import { useInventoryActions } from '../../../../inventoryActions/useInventoryActions';
import { useHoldInventory } from '../../../../inventoryActions/useApi';
import { useShareFooterProps } from '../../hooks';
import HostSection from '../HostSection';

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
  const formFooterProps = useShareFooterProps(inventoryList);

  return (
    <FormWrapper methods={methods} submitText={submitText} {...formFooterProps}>
      <HostSection
        inventoryList={inventoryList}
        queryInventoryListLoading={queryInventoryListLoading}
      />
    </FormWrapper>
  );
}

export default HoldInventory;
