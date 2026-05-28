import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import FormDrawerWrapper from '../../fields/FormDrawerWrapper';
import InventoryGrid from '../../inventoryActions/InventoryGrid';
import { StockInActionsFragment } from '../../../graphql/generated/.graphql';
import { useShareFooterProps } from '../hooks';
import AllocateInventoryField from '../../inventoryActions/fields/AllocateInventoryField';
import { defaultValues } from '../../inventoryActions/fields/AllocateInventoryField/defaultValues';
import { formSchema } from './schema';
import { FormValues } from './typing';
import { useAllocateInventory } from '../../inventoryActions/useApi';
import classes from '../index.module.scss';

interface AllocateInventoryProps {
  inventoryList: StockInActionsFragment[];
  queryInventoryListLoading: boolean;
  onClose: VoidFunction;
  open: boolean;
}

const AllocateInventory: FC<AllocateInventoryProps> = ({
  inventoryList,
  queryInventoryListLoading,
  onClose,
  open,
}) => {
  const methods = useForm<FormValues>({
    resolver: yupResolver(formSchema),
    defaultValues,
  });
  const { onSubmit } = useAllocateInventory(inventoryList);
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
      <div className={classes.wrapper}>
        <div className={classes.fieldsWrapper}>
          <AllocateInventoryField />
        </div>
        <InventoryGrid
          inventoryList={inventoryList}
          queryInventoryListLoading={queryInventoryListLoading}
        />
      </div>
    </FormDrawerWrapper>
  );
};

export default AllocateInventory;
