import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { isEmpty } from 'lodash';
import { IconDefinition } from '@mezzanine-ui/icons';
import { Message } from '@mezzanine-ui/react';
import FormDrawerWrapper from '../../fields/FormDrawerWrapper';
import InventoryGrid from '../InventoryGrid';
import { AggregatedStockFragment } from '../../../graphql/generated/.graphql';
import { useClearAll } from '../hooks';
import { useInventoryActions } from '../../inventoryActions/useInventoryActions';

interface ScrapInventoryProps {
  inventoryList: AggregatedStockFragment[];
  queryInventoryListLoading: boolean;
  onClose: VoidFunction;
  open: boolean;
  headerTitle: string;
  bottomPrimaryActionText: string;
  bottomPrimaryActionIcon?: IconDefinition;
}

const ScrapInventory: FC<ScrapInventoryProps> = ({
  inventoryList,
  queryInventoryListLoading,
  onClose,
  open,
  headerTitle,
  bottomPrimaryActionText,
  bottomPrimaryActionIcon,
}) => {
  const methods = useForm();
  const { errorSignature, inventorySignature, targetInventoryIds, resetAll } =
    useInventoryActions();
  const onClearAll = useClearAll();

  const haveError = useMemo(() => !isEmpty(errorSignature), [errorSignature]);

  return (
    <FormDrawerWrapper
      onClose={onClose}
      open={open}
      methods={methods}
      onSubmit={async () => {
        //
      }}
      headerTitle={headerTitle}
      bottomPrimaryActionText={bottomPrimaryActionText}
      bottomPrimaryActionIcon={bottomPrimaryActionIcon}
      bottomPrimaryActionDisabled={haveError}
      bottomOnGhostActionClick={onClearAll}
      bottomPrimaryActionVariant="destructive-primary"
    >
      <InventoryGrid
        inventoryList={inventoryList}
        queryInventoryListLoading={queryInventoryListLoading}
      />
    </FormDrawerWrapper>
  );
};

export default ScrapInventory;
