import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { AggregatedStockFragment } from '../../../../../graphql/generated/.graphql';
import { FormWrapper } from '../../../../fields/FormWrapper';
import { useShareFooterProps } from '../../hooks';
import HostSection from '../HostSection';
import { defaultValues } from '../../../../inventoryActions/fields/DeliverToCustomerField/defaultValues';
import { formSchema } from './schema';
import { FormValues } from './typing';

interface DeliverToCustomerProps {
  inventoryList: AggregatedStockFragment[];
  queryInventoryListLoading: boolean;
}

function DeliverToCustomer({
  inventoryList,
  queryInventoryListLoading,
}: DeliverToCustomerProps) {
  const methods = useForm<FormValues>({
    resolver: yupResolver(formSchema),
    defaultValues,
  });

  const formFooterProps = useShareFooterProps(inventoryList);

  return (
    <FormWrapper methods={methods} {...formFooterProps}>
      <HostSection
        inventoryList={inventoryList}
        queryInventoryListLoading={queryInventoryListLoading}
      />
    </FormWrapper>
  );
}

export default DeliverToCustomer;
