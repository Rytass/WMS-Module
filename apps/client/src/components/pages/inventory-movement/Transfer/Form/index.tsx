import { TransferOrderFragment } from '../../../../../graphql/generated/.graphql';
import { getMaterialUnitOptions } from '../../../../inventoryActions/utils';
import InventoryMovementTransferFormBody from './FormBody';

interface InventoryMovementTransferFormProps {
  transferOrder: TransferOrderFragment | null;
  closeModal: VoidFunction;
  open: boolean;
}

function InventoryMovementTransferForm({
  transferOrder,
  closeModal,
  open,
}: InventoryMovementTransferFormProps) {
  if (!transferOrder) return null;

  return (
    <InventoryMovementTransferFormBody
      defaultValues={{
        items: transferOrder.items
          .filter((item) => !item.removedAt)
          .map((item) => ({
            itemId: item.id,
            quantity: 0,
            targetTransferredQuantity: item.targetTransferredQuantity,
            transferredQuantity: 0, // 待補
            unitId: null, // 待補
            unitOptions: getMaterialUnitOptions(item.material),
            material: {
              id: item.material.id,
              name: item.material.key,
            },
            batch: item.batch
              ? {
                  id: item.batch.id,
                  name: item.batch.key,
                }
              : null,
            location: item.location
              ? {
                  id: item.location.id,
                  name: item.location.key,
                }
              : null,
            loader: item.loader
              ? {
                  id: item.loader.id,
                  name: item.loader.serialId,
                }
              : null,
            materialDescription: item.material.description,
            saleId: item.saleId
              ? {
                  id: item.saleId,
                  name: item.saleId,
                }
              : null,
            saleSerialId: item.saleSerialId
              ? {
                  id: item.saleSerialId,
                  name: item.saleSerialId,
                }
              : null,
            removedAt: item.removedAt || '',
          })),
      }}
      orderKey={transferOrder.key}
      createdBy={transferOrder.createdBy}
      receiver={transferOrder.receiver}
      createdAt={transferOrder.createdAt}
      targetLocation={
        transferOrder.targetLocation
          ? {
              id: transferOrder.targetLocation.id,
              name: transferOrder.targetLocation.key,
            }
          : null
      }
      targetLoader={
        transferOrder.targetLoader
          ? {
              id: transferOrder.targetLoader.id,
              name: transferOrder.targetLoader.serialId,
            }
          : null
      }
      description={transferOrder.description ?? '-'}
      closeModal={closeModal}
      open={open}
    />
  );
}

export default InventoryMovementTransferForm;
