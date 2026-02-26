import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { AggregatedStockFragment } from '../../../../../graphql/generated/.graphql';
import { FormWrapper } from '../../../../fields/FormWrapper';
import { useInventoryActions } from '../../../../inventoryActions/useInventoryActions';
import { useShareFooterProps } from '../../hooks';
import HostSection from '../HostSection';
import { formSchema } from './schema';
import { FormValues } from './typing';

interface MergeBatchProps {
  inventoryList: AggregatedStockFragment[];
  queryInventoryListLoading: boolean;
  submitText: string;
}

function MergeBatch({
  inventoryList,
  queryInventoryListLoading,
  submitText,
}: MergeBatchProps) {
  const methods = useForm<FormValues>({
    resolver: yupResolver(formSchema),
    defaultValues: {
      newKey: '',
    },
  });

  const { targetAction, errorSignature, inventorySignature, resetAll } =
    useInventoryActions();
  const formFooterProps = useShareFooterProps(inventoryList);

  return (
    <FormWrapper methods={methods} submitText={submitText} {...formFooterProps}>
      <HostSection
        inventoryList={inventoryList}
        queryInventoryListLoading={queryInventoryListLoading}
      />
    </FormWrapper>
  );
}

export default MergeBatch;
