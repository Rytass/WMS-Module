import { useForm } from 'react-hook-form';
import { AggregatedStockFragment } from '../../../../../graphql/generated/.graphql';
import { FormWrapper } from '../../../../fields/FormWrapper';
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
  const formFooterProps = useShareFooterProps(inventoryList);

  return (
    <FormWrapper methods={methods} {...formFooterProps}>
      <HostSection
        inventoryList={inventoryList}
        queryInventoryListLoading={queryInventoryListLoading}
      />
    </FormWrapper>
  );
}

export default ReleaseInventoryHold;
