import { useForm } from 'react-hook-form';
import { AggregatedStockFragment } from '../../../../../graphql/generated/.graphql';
import { FormWrapper } from '../../../../fields/FormWrapper';
import { useReleaseHoldInventory } from '../../../../inventoryActions/useApi';
import { useShareFooterProps } from '../../hooks';
import HostSection from '../HostSection';

interface ReleaseInventoryHoldProps {
  inventoryList: AggregatedStockFragment[];
  queryInventoryListLoading: boolean;
}

function ReleaseInventoryHold({
  inventoryList,
  queryInventoryListLoading,
}: ReleaseInventoryHoldProps) {
  const methods = useForm();
  const { onSubmit } = useReleaseHoldInventory(inventoryList);
  const formFooterProps = useShareFooterProps(inventoryList);

  return (
    <FormWrapper methods={methods} onSubmit={onSubmit} {...formFooterProps}>
      <HostSection
        inventoryList={inventoryList}
        queryInventoryListLoading={queryInventoryListLoading}
      />
    </FormWrapper>
  );
}

export default ReleaseInventoryHold;
