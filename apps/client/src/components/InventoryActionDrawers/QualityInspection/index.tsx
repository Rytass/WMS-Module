import { useForm } from 'react-hook-form';
import { DangerousOutlineIcon } from '@mezzanine-ui/icons';
import FormDrawerWrapper from '../../fields/FormDrawerWrapper';
import InventoryGrid from '../../inventoryActions/InventoryGrid';
import { AggregatedStockFragment } from '../../../graphql/generated/.graphql';
import { useShareFooterProps } from '../hooks';

interface QualityInspectionProps {
  inventoryList: AggregatedStockFragment[];
  queryInventoryListLoading: boolean;
  onClose: VoidFunction;
  open: boolean;
}

const QualityInspection: FC<QualityInspectionProps> = ({
  inventoryList,
  queryInventoryListLoading,
  onClose,
  open,
}) => {
  const methods = useForm();
  const formFooterProps = useShareFooterProps({
    inventoryList,
    onClose,
    open,
  });

  return (
    <FormDrawerWrapper
      methods={methods}
      bottomSecondaryActionText="不通過"
      bottomSecondaryActionVariant="destructive-primary"
      bottomSecondaryActionIcon={DangerousOutlineIcon}
      bottomOnSecondaryActionClick={async (values) => {
        console.log('不通過！', values);
      }}
      onSubmit={async () => {
        //
      }}
      {...formFooterProps}
    >
      <InventoryGrid
        inventoryList={inventoryList}
        queryInventoryListLoading={queryInventoryListLoading}
      />
    </FormDrawerWrapper>
  );
};

export default QualityInspection;
