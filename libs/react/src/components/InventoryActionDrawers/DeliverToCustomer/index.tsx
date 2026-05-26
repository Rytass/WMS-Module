import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import FormDrawerWrapper from '../../fields/FormDrawerWrapper';
import InventoryGrid from '../../inventoryActions/InventoryGrid';
import { StockInActionsFragment } from '../../../graphql/generated/.graphql';
import { useShareFooterProps } from '../hooks';
import DeliverToCustomerField from '../../inventoryActions/fields/DeliverToCustomerField';
import { defaultValues } from '../../inventoryActions/fields/DeliverToCustomerField/defaultValues';
import { formSchema } from './schema';
import { FormValues } from './typing';
import { useTransferCustomer } from '../../inventoryActions/useApi';
import classes from '../index.module.scss';

interface DeliverToCustomerProps {
  inventoryList: StockInActionsFragment[];
  queryInventoryListLoading: boolean;
  onClose: VoidFunction;
  open: boolean;
}

const DeliverToCustomer: FC<DeliverToCustomerProps> = ({
  inventoryList,
  queryInventoryListLoading,
  onClose,
  open,
}) => {
  const methods = useForm<FormValues>({
    resolver: yupResolver(formSchema),
    defaultValues,
  });
  const { onSubmit } = useTransferCustomer(inventoryList);
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
          <DeliverToCustomerField />
        </div>
        <InventoryGrid
          inventoryList={inventoryList}
          queryInventoryListLoading={queryInventoryListLoading}
        />
      </div>
    </FormDrawerWrapper>
  );
};

export default DeliverToCustomer;
