import { useForm } from 'react-hook-form';
import { IconDefinition } from '@mezzanine-ui/icons';
import { Message } from '@mezzanine-ui/react';
import FormDrawerWrapper from '../../fields/FormDrawerWrapper';
import InventoryGrid from '../../inventoryActions/InventoryGrid';
import { AggregatedStockFragment } from '../../../graphql/generated/.graphql';
import { useShareFooterProps } from '../hooks';
import { useInventoryActions } from '../../inventoryActions/useInventoryActions';
import { isEnableActionStatus } from '../../inventoryActions/utils';
import { useHoldInventory } from '../../inventoryActions/useApi';

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
  const { targetAction, inventorySignature, resetAll } = useInventoryActions();
  const { holdInventory } = useHoldInventory();
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
      {...formFooterProps}
    >
      <InventoryGrid
        inventoryList={inventoryList}
        queryInventoryListLoading={queryInventoryListLoading}
      />
    </FormDrawerWrapper>
  );
};

export default HoldInventory;
