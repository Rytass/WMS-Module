import { useForm } from 'react-hook-form';
import { DangerousOutlineIcon } from '@mezzanine-ui/icons';
import { AggregatedStockFragment } from '../../../../../graphql/generated/.graphql';
import { FormWrapper } from '../../../../fields/FormWrapper';
import { useShareFooterProps } from '../../hooks';
import HostSection from '../HostSection';

interface QualityInspectionProps {
  inventoryList: AggregatedStockFragment[];
  queryInventoryListLoading: boolean;
}

function QualityInspection({
  inventoryList,
  queryInventoryListLoading,
}: QualityInspectionProps) {
  const methods = useForm();
  const formFooterProps = useShareFooterProps(inventoryList);

  return (
    <FormWrapper
      methods={methods}
      {...formFooterProps}
      haveCancelButton
      cancelText="不通過"
      secondaryButtonIcon={DangerousOutlineIcon}
      secondaryButtonVariant="destructive-primary"
    >
      <HostSection
        inventoryList={inventoryList}
        queryInventoryListLoading={queryInventoryListLoading}
      />
    </FormWrapper>
  );
}

export default QualityInspection;
