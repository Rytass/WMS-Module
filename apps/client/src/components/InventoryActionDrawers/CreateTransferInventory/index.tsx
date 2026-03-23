import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import FormDrawerWrapper from '../../fields/FormDrawerWrapper';
import InventoryGrid from '../../inventoryActions/InventoryGrid';
import { AggregatedStockFragment } from '../../../graphql/generated/.graphql';
import { useShareFooterProps } from '../hooks';
import CreateTransferInventoryField from '../../inventoryActions/fields/CreateTransferInventoryField';
import { formSchema } from './schema';
import { FormValues } from './typing';
import classes from '../index.module.scss';

interface CreateTransferInventoryProps {
  inventoryList: AggregatedStockFragment[];
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
    defaultValues: {
      newKey: '',
    },
  });

  const formFooterProps = useShareFooterProps({
    inventoryList,
    onClose,
    open,
  });

  return (
    <FormDrawerWrapper
      methods={methods}
      onSubmit={() => {
        //
      }}
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
