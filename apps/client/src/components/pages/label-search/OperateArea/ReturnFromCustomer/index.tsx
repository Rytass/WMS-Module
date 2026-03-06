import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { AggregatedStockFragment } from '../../../../../graphql/generated/.graphql';
import { FormWrapper } from '../../../../fields/FormWrapper';
import { useShareFooterProps } from '../../hooks';
import HostSection from '../HostSection';
import { formSchema } from './schema';
import { FormValues } from './typing';

interface ReturnFromCustomerProps {
  inventoryList: AggregatedStockFragment[];
  queryInventoryListLoading: boolean;
}

function ReturnFromCustomer({
  inventoryList,
  queryInventoryListLoading,
}: ReturnFromCustomerProps) {
  const methods = useForm<FormValues>({
    resolver: yupResolver(formSchema),
    defaultValues: {
      location: null,
      loader: null,
    },
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

export default ReturnFromCustomer;
