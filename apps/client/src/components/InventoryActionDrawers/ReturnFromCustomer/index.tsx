import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import FormDrawerWrapper from '../../fields/FormDrawerWrapper';
import InventoryGrid from '../../inventoryActions/InventoryGrid';
import { StockInActionsFragment } from '../../../graphql/generated/.graphql';
import { useShareFooterProps } from '../hooks';
import ReturnFromCustomerField from '../../inventoryActions/fields/ReturnFromCustomerField';
import { defaultValues } from '../../inventoryActions/fields/ReturnFromCustomerField/defaultValues';
import { formSchema } from './schema';
import { FormValues } from './typing';
import { useReturnCustomer } from '../../inventoryActions/useApi';
import classes from '../index.module.scss';

interface ReturnFromCustomerProps {
  inventoryList: StockInActionsFragment[];
  queryInventoryListLoading: boolean;
  onClose: VoidFunction;
  open: boolean;
}

const ReturnFromCustomer: FC<ReturnFromCustomerProps> = ({
  inventoryList,
  queryInventoryListLoading,
  onClose,
  open,
}) => {
  const methods = useForm<FormValues>({
    resolver: yupResolver(formSchema),
    defaultValues,
  });
  const { onSubmit } = useReturnCustomer(inventoryList);
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
          <ReturnFromCustomerField />
        </div>
        <InventoryGrid
          inventoryList={inventoryList}
          queryInventoryListLoading={queryInventoryListLoading}
        />
      </div>
    </FormDrawerWrapper>
  );
};

export default ReturnFromCustomer;
