import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { AggregatedStockFragment } from '../../../../../graphql/generated/.graphql';
import { FormWrapper } from '../../../../fields/FormWrapper';
import { useShareFooterProps } from '../../hooks';
import HostSection from '../HostSection';
import ShipInventoryMatcher from '../../../../inventoryActions/ShipInventoryMatcher';
import { defaultValues } from '../../../../inventoryActions/fields/ShipInventoryField/defaultValues';
import { formSchema } from './schema';
import { FormValues } from './typing';

interface ShipInventoryProps {
  inventoryList: AggregatedStockFragment[];
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

  const formFooterProps = useShareFooterProps(inventoryList);

  return (
    <FormWrapper methods={methods} {...formFooterProps}>
      <HostSection
        inventoryList={inventoryList}
        queryInventoryListLoading={queryInventoryListLoading}
        customizedMainBlock={
          shipInventoryOrder ? <ShipInventoryMatcher /> : undefined
        }
      />
    </FormWrapper>
  );
}

export default ShipInventory;
