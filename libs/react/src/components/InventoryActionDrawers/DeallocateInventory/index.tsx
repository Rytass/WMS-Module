import { useForm } from 'react-hook-form';
import FormDrawerWrapper from '../../fields/FormDrawerWrapper';
import InventoryGrid from '../../inventoryActions/InventoryGrid';
import { StockInActionsFragment } from '../../../graphql/generated/.graphql';
import { useShareFooterProps } from '../hooks';
import { useDeallocateInventory } from '../../inventoryActions/useApi';

interface DeallocateInventoryProps {
  inventoryList: StockInActionsFragment[];
  queryInventoryListLoading: boolean;
  onClose: VoidFunction;
  open: boolean;
}

const DeallocateInventory: FC<DeallocateInventoryProps> = ({
  inventoryList,
  queryInventoryListLoading,
  onClose,
  open,
}) => {
  const methods = useForm();
  const { onSubmit } = useDeallocateInventory(inventoryList);
  const formFooterProps = useShareFooterProps({
    inventoryList,
    onClose,
    open,
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

export default DeallocateInventory;
