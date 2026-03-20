import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import FormDrawerWrapper from '../../fields/FormDrawerWrapper';
import SplitTarget from '../../inventoryActions/SplitTarget';
import { AggregatedStockFragment } from '../../../graphql/generated/.graphql';
import { useShareFooterProps } from '../hooks';
import SplitBatchField from '../../inventoryActions/fields/SplitBatchField';
import { formSchema } from './schema';
import { FormValues } from './typing';
import classes from '../index.module.scss';

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
  const methods = useForm<FormValues>({
    resolver: yupResolver(formSchema),
    defaultValues: {
      items: [],
    },
  });

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
      <div className={classes.wrapper}>
        <div className={classes.fieldsWrapper}>
          <SplitTarget inventory={inventory} />
        </div>
        <SplitBatchField />
      </div>
    </FormDrawerWrapper>
  );
};

export default SplitBatch;
