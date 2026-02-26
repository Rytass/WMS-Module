import { useForm } from 'react-hook-form';
import { IconDefinition } from '@mezzanine-ui/icons';
import FormDrawerWrapper from '../../fields/FormDrawerWrapper';
import InventoryGrid from '../../inventoryActions/InventoryGrid';
import { AggregatedStockFragment } from '../../../graphql/generated/.graphql';
import { useShareFooterProps } from '../hooks';

interface ScrapInventoryProps {
  inventoryList: AggregatedStockFragment[];
  queryInventoryListLoading: boolean;
  onClose: VoidFunction;
  open: boolean;
  headerTitle: string;
  bottomPrimaryActionText: string;
  bottomPrimaryActionIcon?: IconDefinition;
}

const ScrapInventory: FC<ScrapInventoryProps> = ({
  inventoryList,
  queryInventoryListLoading,
  onClose,
  open,
  headerTitle,
  bottomPrimaryActionText,
  bottomPrimaryActionIcon,
}) => {
  const methods = useForm();
  const formFooterProps = useShareFooterProps({
    inventoryList,
    onClose,
    open,
    headerTitle,
    bottomPrimaryActionText,
    bottomPrimaryActionIcon,
  });

  return (
    <FormDrawerWrapper
      methods={methods}
      onSubmit={async () => {
        //
      }}
      bottomPrimaryActionVariant="destructive-primary"
      {...formFooterProps}
    >
      <InventoryGrid
        inventoryList={inventoryList}
        queryInventoryListLoading={queryInventoryListLoading}
      />
    </FormDrawerWrapper>
  );
};

export default ScrapInventory;
