import { useForm } from 'react-hook-form';
import FormDrawerWrapper from '../../fields/FormDrawerWrapper';
import InventoryGrid from '../../inventoryActions/InventoryGrid';
import { StockInActionsFragment } from '../../../graphql/generated/.graphql';
import { useShareFooterProps } from '../hooks';
import { useScrapInventory } from '../../inventoryActions/useApi';

interface ScrapInventoryProps {
  inventoryList: StockInActionsFragment[];
  queryInventoryListLoading: boolean;
  onClose: VoidFunction;
  open: boolean;
}

const ScrapInventory: FC<ScrapInventoryProps> = ({
  inventoryList,
  queryInventoryListLoading,
  onClose,
  open,
}) => {
  const methods = useForm();
  const { onSubmit } = useScrapInventory(inventoryList);
  const formFooterProps = useShareFooterProps({
    inventoryList,
    onClose,
    open,
  });

  return (
    <FormDrawerWrapper
      methods={methods}
      onSubmit={onSubmit}
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
