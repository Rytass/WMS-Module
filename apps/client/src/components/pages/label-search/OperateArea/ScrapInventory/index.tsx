import { useForm } from 'react-hook-form';
import { AggregatedStockFragment } from '../../../../../graphql/generated/.graphql';
import { FormWrapper } from '../../../../fields/FormWrapper';
import { useShareFooterProps } from '../../hooks';
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
  const formFooterProps = useShareFooterProps(inventoryList);

  return (
    <FormWrapper
      methods={methods}
      submitText={submitText}
      primaryButtonVariant="destructive-primary"
      {...formFooterProps}
    >
      <HostSection
        inventoryList={inventoryList}
        queryInventoryListLoading={queryInventoryListLoading}
      />
    </FormWrapper>
  );
}

export default ScrapInventory;
