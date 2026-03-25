import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import FormDrawerWrapper from '../../fields/FormDrawerWrapper';
import InventoryGrid from '../../inventoryActions/InventoryGrid';
import { AggregatedStockFragment } from '../../../graphql/generated/.graphql';
import { useShareFooterProps } from '../hooks';
import ShipInventoryField from '../../inventoryActions/fields/ShipInventoryField';
import ShipInventoryMatcher from '../../inventoryActions/ShipInventoryMatcher';
import { defaultValues } from '../../inventoryActions/fields/ShipInventoryField/defaultValues';
import { formSchema } from './schema';
import { FormValues } from './typing';
import { useShipInventory } from '../../inventoryActions/useApi';
import classes from '../index.module.scss';

interface ShipInventoryProps {
  inventoryList: AggregatedStockFragment[];
  queryInventoryListLoading: boolean;
  onClose: VoidFunction;
  open: boolean;
}

const ShipInventory: FC<ShipInventoryProps> = ({
  inventoryList,
  queryInventoryListLoading,
  onClose,
  open,
}) => {
  const methods = useForm<FormValues>({
    resolver: yupResolver(formSchema),
    defaultValues,
  });

  const shipInventoryOrder = methods.watch('shipInventoryOrder');

  const { onSubmit } = useShipInventory(inventoryList);

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
      bottomPrimaryActionDisabled={
        formFooterProps.bottomPrimaryActionDisabled || !shipInventoryOrder
      }
    >
      <div className={classes.wrapper}>
        <div className={classes.fieldsWrapper}>
          <ShipInventoryField />
        </div>
        {shipInventoryOrder ? (
          <ShipInventoryMatcher
            orderId={shipInventoryOrder.id}
            haveFilterButton
          />
        ) : (
          <InventoryGrid
            inventoryList={inventoryList}
            queryInventoryListLoading={queryInventoryListLoading}
            disabledInput
          />
        )}
      </div>
    </FormDrawerWrapper>
  );
};

export default ShipInventory;
