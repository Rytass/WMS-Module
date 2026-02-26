import { useForm } from 'react-hook-form';
import { AggregatedStockFragment } from '../../../../../graphql/generated/.graphql';
import { FormWrapper } from '../../../../fields/FormWrapper';
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
  const { onSubmit } = useHoldInventory(inventoryList);
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
