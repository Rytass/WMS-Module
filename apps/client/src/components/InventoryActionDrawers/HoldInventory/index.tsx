import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { isEmpty } from 'lodash';
import { IconDefinition } from '@mezzanine-ui/icons';
import { Message } from '@mezzanine-ui/react';
import FormDrawerWrapper from '../../fields/FormDrawerWrapper';
import InventoryGrid from '../../inventoryActions/InventoryGrid';
import { AggregatedStockFragment } from '../../../graphql/generated/.graphql';
import { useClearAll } from '../hooks';
import { useInventoryActions } from '../../inventoryActions/useInventoryActions';
import { isEnableActionStatus } from '../../../utils/inventoryActions';
import { useHoldInventory } from '../useApi';

interface HoldInventoryProps {
  inventoryList: AggregatedStockFragment[];
  queryInventoryListLoading: boolean;
  onClose: VoidFunction;
  open: boolean;
  headerTitle: string;
  bottomPrimaryActionText: string;
  bottomPrimaryActionIcon?: IconDefinition;
}

const HoldInventory: FC<HoldInventoryProps> = ({
  inventoryList,
  queryInventoryListLoading,
  onClose,
  open,
  headerTitle,
  bottomPrimaryActionText,
  bottomPrimaryActionIcon,
}) => {
  const methods = useForm();
  const {
    targetAction,
    errorSignature,
    inventorySignature,

    resetAll,
  } = useInventoryActions();
  const { holdInventory } = useHoldInventory();
  const onClearAll = useClearAll();

  const haveError = useMemo(() => !isEmpty(errorSignature), [errorSignature]);

  return (
    <FormDrawerWrapper
      onClose={onClose}
      open={open}
      methods={methods}
      onSubmit={async () => {
        try {
          const { data } = await holdInventory({
            variables: {
              items: inventoryList
                .filter((item) =>
                  isEnableActionStatus(item.status, targetAction?.status),
                )
                .map((item) => inventorySignature[item.id])
                .map((s) => ({
                  aggregatedKey: s.id,
                  unitId: s.unitId,
                  targetHeldQuantity: s.quantity,
                })),
            },
          });

          if (data?.createHoldInventoryOrder.id) {
            Message.success(`${bottomPrimaryActionText}成功`);
            resetAll();
          }
        } catch (error) {
          console.error(error);
        }
      }}
      headerTitle={headerTitle}
      bottomPrimaryActionText={bottomPrimaryActionText}
      bottomPrimaryActionIcon={bottomPrimaryActionIcon}
      bottomPrimaryActionDisabled={haveError}
      bottomOnGhostActionClick={onClearAll}
    >
      <InventoryGrid
        inventoryList={inventoryList}
        queryInventoryListLoading={queryInventoryListLoading}
      />
    </FormDrawerWrapper>
  );
};

export default HoldInventory;
