import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import FormDrawerWrapper from '../../fields/FormDrawerWrapper';
import InventoryGrid from '../../inventoryActions/InventoryGrid';
import { StockInActionsFragment } from '../../../graphql/generated/.graphql';
import { useShareFooterProps } from '../hooks';
import CreateTransferInventoryField from '../../inventoryActions/fields/CreateTransferInventoryField';
import { defaultValues } from '../../inventoryActions/fields/CreateTransferInventoryField/defaultValues';
import { formSchema } from './schema';
import { FormValues } from './typing';
import { useCreateTransferInventory } from '../../inventoryActions/useApi';
import classes from '../index.module.scss';

interface CreateTransferInventoryProps {
  inventoryList: StockInActionsFragment[];
  queryInventoryListLoading: boolean;
  onClose: VoidFunction;
  open: boolean;
}

const CreateTransferInventory: FC<CreateTransferInventoryProps> = ({
  inventoryList,
  queryInventoryListLoading,
  onClose,
  open,
}) => {
  const methods = useForm<FormValues>({
    resolver: yupResolver(formSchema),
    defaultValues,
  });
  const { onSubmit } = useCreateTransferInventory(inventoryList);
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
          <CreateTransferInventoryField />
        </div>
        <InventoryGrid
          inventoryList={inventoryList}
          queryInventoryListLoading={queryInventoryListLoading}
        />
      </div>
    </FormDrawerWrapper>
  );
};

export default CreateTransferInventory;
