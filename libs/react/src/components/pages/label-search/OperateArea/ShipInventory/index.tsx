import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { StockInActionsFragment } from '../../../../../graphql/generated/.graphql';
import { FormWrapper } from '../../../../fields/FormWrapper';
import { useShareFooterProps } from '../../hooks';
import HostSection from '../HostSection';
import ShipInventoryMatcher from '../../../../inventoryActions/ShipInventoryMatcher';
import { defaultValues } from '../../../../inventoryActions/fields/ShipInventoryField/defaultValues';
import { formSchema } from './schema';
import { FormValues } from './typing';
import { useShipInventory } from '../../../../inventoryActions/useApi';

interface ShipInventoryProps {
  inventoryList: StockInActionsFragment[];
  queryInventoryListLoading: boolean;
}

function ShipInventory({
  inventoryList,
  queryInventoryListLoading,
}: ShipInventoryProps) {
  const methods = useForm<FormValues>({
    resolver: yupResolver(formSchema),
    defaultValues,
  });

  const shipInventoryOrder = methods.watch('shipInventoryOrder');

  const { onSubmit } = useShipInventory(inventoryList);
  const formFooterProps = useShareFooterProps(inventoryList);

  return (
    <FormWrapper
      methods={methods}
      onSubmit={onSubmit}
      {...formFooterProps}
      disableSubmitButton={() =>
        formFooterProps.disableSubmitButton() || !shipInventoryOrder
      }
    >
      <HostSection
        inventoryList={inventoryList}
        queryInventoryListLoading={queryInventoryListLoading}
        customizedMainBlock={
          shipInventoryOrder ? (
            <ShipInventoryMatcher orderId={shipInventoryOrder.id} />
          ) : undefined
        }
        disabledInput
      />
    </FormWrapper>
  );
}

export default ShipInventory;
