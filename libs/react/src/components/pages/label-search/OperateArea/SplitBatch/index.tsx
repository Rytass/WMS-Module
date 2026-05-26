import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { StockInActionsFragment } from '../../../../../graphql/generated/.graphql';
import { FormWrapper } from '../../../../fields/FormWrapper';
import { useShareFooterProps } from '../../hooks';
import HostSection from '../HostSection';
import SplitTarget from '../../../../inventoryActions/SplitTarget';
import { defaultValues } from '../../../../inventoryActions/fields/SplitBatchField/defaultValues';
import { formSchema } from './schema';
import { FormValues } from './typing';
import { useSplitBatch } from '../../../../inventoryActions/useApi';

interface SplitBatchProps {
  inventoryList: StockInActionsFragment[];
  queryInventoryListLoading: boolean;
}

function SplitBatch({
  inventoryList,
  queryInventoryListLoading,
}: SplitBatchProps) {
  const methods = useForm<FormValues>({
    resolver: yupResolver(formSchema),
    defaultValues,
  });

  const inventory = useMemo(() => inventoryList[0], [inventoryList]);

  const { onSubmit } = useSplitBatch(inventory);
  const formFooterProps = useShareFooterProps(inventoryList);

  return (
    <FormWrapper methods={methods} onSubmit={onSubmit} {...formFooterProps}>
      <HostSection
        inventoryList={inventoryList}
        queryInventoryListLoading={queryInventoryListLoading}
        customizedMainBlock={
          <SplitTarget
            inventory={inventory}
            loading={queryInventoryListLoading}
          />
        }
      />
    </FormWrapper>
  );
}

export default SplitBatch;
