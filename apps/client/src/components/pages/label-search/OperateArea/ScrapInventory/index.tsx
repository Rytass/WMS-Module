import { useForm } from 'react-hook-form';
import { StockInActionsFragment } from '../../../../../graphql/generated/.graphql';
import { FormWrapper } from '../../../../fields/FormWrapper';
import { useScrapInventory } from '../../../../inventoryActions/useApi';
import { useShareFooterProps } from '../../hooks';
import HostSection from '../HostSection';

interface ScrapInventoryProps {
  inventoryList: StockInActionsFragment[];
  queryInventoryListLoading: boolean;
}

function ScrapInventory({
  inventoryList,
  queryInventoryListLoading,
}: ScrapInventoryProps) {
  const methods = useForm();
  const { onSubmit } = useScrapInventory(inventoryList);
  const formFooterProps = useShareFooterProps(inventoryList);

  return (
    <FormWrapper
      methods={methods}
      onSubmit={onSubmit}
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
