import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { AggregatedStockFragment } from '../../../../../graphql/generated/.graphql';
import { FormWrapper } from '../../../../fields/FormWrapper';
import { useShareFooterProps } from '../../hooks';
import HostSection from '../HostSection';
import SplitTarget from '../../../../inventoryActions/SplitTarget';
import { formSchema } from './schema';
import { FormValues } from './typing';

interface SplitBatchProps {
  inventoryList: AggregatedStockFragment[];
  queryInventoryListLoading: boolean;
}

function SplitBatch({
  inventoryList,
  queryInventoryListLoading,
}: SplitBatchProps) {
  const methods = useForm<FormValues>({
    resolver: yupResolver(formSchema),
    defaultValues: {
      items: [],
    },
  });

  const formFooterProps = useShareFooterProps(inventoryList);

  return (
    <FormWrapper methods={methods} {...formFooterProps}>
      <HostSection
        inventoryList={inventoryList}
        queryInventoryListLoading={queryInventoryListLoading}
        customizedMainBlock={<SplitTarget inventory={inventoryList[0]} />}
      />
    </FormWrapper>
  );
}

export default SplitBatch;
