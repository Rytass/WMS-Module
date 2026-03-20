import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import FormDrawerWrapper from '../../fields/FormDrawerWrapper';
import SplitTarget from '../../inventoryActions/SplitTarget';
import { AggregatedStockFragment } from '../../../graphql/generated/.graphql';
import { useShareFooterProps } from '../hooks';

interface SplitBatchProps {
  inventoryList: AggregatedStockFragment[];
  queryInventoryListLoading: boolean;
  onClose: VoidFunction;
  open: boolean;
}

const SplitBatch: FC<SplitBatchProps> = ({
  inventoryList,
  queryInventoryListLoading,
  onClose,
  open,
}) => {
  const methods = useForm();
  const formFooterProps = useShareFooterProps({
    inventoryList,
    onClose,
    open,
  });

  const inventory = useMemo(() => inventoryList[0], [inventoryList]);

  return (
    <FormDrawerWrapper
      methods={methods}
      onSubmit={(values) => {
        console.log('values', values);
      }}
      {...formFooterProps}
    >
      <SplitTarget inventory={inventory} haveGrayBg />
    </FormDrawerWrapper>
  );
};

export default SplitBatch;
