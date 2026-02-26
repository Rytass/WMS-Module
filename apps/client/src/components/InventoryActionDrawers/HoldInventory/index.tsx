import { useForm } from 'react-hook-form';
import { IconDefinition } from '@mezzanine-ui/icons';
import FormDrawerWrapper from '../../fields/FormDrawerWrapper';
import InventoryGrid from '../../inventoryActions/InventoryGrid';
import { AggregatedStockFragment } from '../../../graphql/generated/.graphql';
import { useShareFooterProps } from '../hooks';
import { useHoldInventory } from '../../inventoryActions/useApi';

interface HoldInventoryProps {
  inventoryList: AggregatedStockFragment[];
  queryInventoryListLoading: boolean;
  onClose: VoidFunction;
  open: boolean;
  headerTitle: string;
  bottomPrimaryActionText: string;
  bottomPrimaryActionIcon?: IconDefinition;
}

const HoldInventory: FC<HoldInventoryProps> = ({
  inventoryList,
  queryInventoryListLoading,
  onClose,
  open,
  headerTitle,
  bottomPrimaryActionText,
  bottomPrimaryActionIcon,
}) => {
  const methods = useForm();
  const { onSubmit } = useHoldInventory(inventoryList);
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
      onSubmit={onSubmit}
      {...formFooterProps}
    >
      <InventoryGrid
        inventoryList={inventoryList}
        queryInventoryListLoading={queryInventoryListLoading}
      />
    </FormDrawerWrapper>
  );
};

export default HoldInventory;
