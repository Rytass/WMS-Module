import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { StockInActionsFragment } from '../../../../../graphql/generated/.graphql';
import { FormWrapper } from '../../../../fields/FormWrapper';
import { useShareFooterProps } from '../../hooks';
import HostSection from '../HostSection';
import { defaultValues } from '../../../../inventoryActions/fields/ReclassifyInventoryField/defaultValues';
import { formSchema } from './schema';
import { FormValues } from './typing';
import { useReclassifyInventory } from '../../../../inventoryActions/useApi';

interface ReclassifyInventoryProps {
  inventoryList: StockInActionsFragment[];
  queryInventoryListLoading: boolean;
}

function ReclassifyInventory({
  inventoryList,
  queryInventoryListLoading,
}: ReclassifyInventoryProps) {
  const methods = useForm<FormValues>({
    resolver: yupResolver(formSchema),
    defaultValues,
  });
  const { onSubmit } = useReclassifyInventory(inventoryList);
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

export default ReclassifyInventory;
