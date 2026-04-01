import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { AggregatedStockFragment } from '../../../../../graphql/generated/.graphql';
import { FormWrapper } from '../../../../fields/FormWrapper';
import { useShareFooterProps } from '../../hooks';
import HostSection from '../HostSection';
import { defaultValues } from '../../../../inventoryActions/fields/DeliverToCustomerField/defaultValues';
import { formSchema } from './schema';
import { FormValues } from './typing';
import { useTransferCustomer } from '../../../../inventoryActions/useApi';

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
  const { onSubmit } = useTransferCustomer(inventoryList);
  const formFooterProps = useShareFooterProps(inventoryList);

  return (
    <FormWrapper methods={methods} onSubmit={onSubmit} {...formFooterProps}>
      <HostSection
        inventoryList={inventoryList}
        queryInventoryListLoading={queryInventoryListLoading}
      />
    </FormWrapper>
  );
}

export default DeliverToCustomer;
