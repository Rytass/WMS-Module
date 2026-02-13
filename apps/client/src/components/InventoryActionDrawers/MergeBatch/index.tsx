import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { isEmpty } from 'lodash';
import { yupResolver } from '@hookform/resolvers/yup';
import { IconDefinition } from '@mezzanine-ui/icons';
import { Message } from '@mezzanine-ui/react';
import FormDrawerWrapper from '../../fields/FormDrawerWrapper';
import InventoryGrid from '../InventoryGrid';
import { AggregatedStockFragment } from '../../../graphql/generated/.graphql';
import { useClearAll } from '../hooks';
import { useInventoryActions } from '../../inventoryActions/useInventoryActions';
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

  const { errorSignature, inventorySignature, targetInventoryIds, resetAll } =
    useInventoryActions();

  const onClearAll = useClearAll();

  const haveError = useMemo(() => !isEmpty(errorSignature), [errorSignature]);

  return (
    <FormDrawerWrapper
      onClose={onClose}
      open={open}
      methods={methods}
      onSubmit={async (values) => {
        console.log('values', values);
      }}
      headerTitle={headerTitle}
      bottomPrimaryActionText={bottomPrimaryActionText}
      bottomPrimaryActionIcon={bottomPrimaryActionIcon}
      bottomPrimaryActionDisabled={haveError}
      bottomOnGhostActionClick={onClearAll}
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
