import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { IconDefinition } from '@mezzanine-ui/icons';
import FormDrawerWrapper from '../../fields/FormDrawerWrapper';
import InventoryGrid from '../../inventoryActions/InventoryGrid';
import { AggregatedStockFragment } from '../../../graphql/generated/.graphql';
import { useShareFooterProps } from '../hooks';
import MergeBatchField from '../../inventoryActions/fields/MergeBatchField';
import { formSchema } from './schema';
import { FormValues } from './typing';
import classes from '../index.module.scss';

interface MergeBatchProps {
  inventoryList: AggregatedStockFragment[];
  queryInventoryListLoading: boolean;
  onClose: VoidFunction;
  open: boolean;
  headerTitle: string;
  bottomPrimaryActionText: string;
  bottomPrimaryActionIcon?: IconDefinition;
}

const MergeBatch: FC<MergeBatchProps> = ({
  inventoryList,
  queryInventoryListLoading,
  onClose,
  open,
  headerTitle,
  bottomPrimaryActionText,
  bottomPrimaryActionIcon,
}) => {
  const methods = useForm<FormValues>({
    resolver: yupResolver(formSchema),
    defaultValues: {
      newKey: '',
    },
  });

  const formFooterProps = useShareFooterProps({
    inventoryList,
    onClose,
    open,
    headerTitle,
    bottomPrimaryActionText,
    bottomPrimaryActionIcon,
  });

  return (
    <FormDrawerWrapper
      methods={methods}
      onSubmit={async (values) => {
        console.log('values', values);
      }}
      {...formFooterProps}
    >
      <div className={classes.wrapper}>
        <div className={classes.fieldsWrapper}>
          <MergeBatchField />
        </div>
        <InventoryGrid
          inventoryList={inventoryList}
          queryInventoryListLoading={queryInventoryListLoading}
        />
      </div>
    </FormDrawerWrapper>
  );
};

export default MergeBatch;
