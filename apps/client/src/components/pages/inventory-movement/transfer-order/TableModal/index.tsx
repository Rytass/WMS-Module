import { useCallback, useState } from 'react';
import { UseFieldArrayAppend } from 'react-hook-form';
import { Modal, Message } from '@mezzanine-ui/react';
import TableModalBody from './TableModalBody';
import { AggregatedStockFragment } from '../../../../../graphql/generated/.graphql';
import {
  getMaterialUnitOptions,
  InventoryActions,
  inventoryActionsSpec,
} from '../../../../inventoryActions/utils';
import { BASE_UNIT } from '../../../../../utils/share';
import { FormValues } from '../Form/typing';

interface TableModalProps {
  open: boolean;
  closeModal: VoidFunction;
  append: UseFieldArrayAppend<FormValues, 'items'>;
}

const TableModal: FC<TableModalProps> = ({ open, closeModal, append }) => {
  const [targetStocks, setTargetStocks] = useState<AggregatedStockFragment[]>(
    [],
  );

  const onConfirm = useCallback(async () => {
    const currentAction = inventoryActionsSpec(
      InventoryActions.CreateTransferInventory,
    );
    const invalidStock = targetStocks.find(
      (stock) => currentAction && !currentAction.condition(stock),
    );

    if (invalidStock) {
      Message.error(`料號：${invalidStock.material.key} / 批號：${invalidStock.batch.key} / 儲存位置：${invalidStock.location.key}
無法執行作業：料號，資料不符作業條件。`);
    } else {
      append(
        targetStocks.map((s) => ({
          material: {
            id: s.material.id,
            name: s.material.key,
          },
          description: s.material.description,
          batch: s.batch
            ? {
                id: s.batch.id,
                name: s.batch.key,
              }
            : null,
          location: s.location
            ? {
                id: s.location.id,
                name: s.location.key,
              }
            : null,
          loader: s.loader
            ? {
                id: s.loader.id,
                name: s.loader.serialId,
              }
            : null,
          unit: BASE_UNIT,
          saleId: s.saleId
            ? {
                id: s.saleId,
                name: s.saleId,
              }
            : null,
          saleSerialId: s.saleSerialId
            ? {
                id: s.saleSerialId,
                name: s.saleSerialId,
              }
            : null,

          itemId: s.id,
          newQuantity: 0,
          maxOriginQuantity: s.quantity,
          transferredQuantity: 0,
          unitOptions: getMaterialUnitOptions(s.material),
          isExisted: false,
          removedAt: '',
        })),
      );

      closeModal();
    }
  }, [targetStocks, append, closeModal]);

  return (
    <Modal
      onClose={closeModal}
      showDismissButton
      modalType="standard"
      size="wide"
      cancelText="取消"
      confirmText="新增"
      onCancel={closeModal}
      onConfirm={onConfirm}
      cancelButtonProps={{
        type: 'button',
      }}
      confirmButtonProps={{
        type: 'button',
      }}
      showStatusTypeIcon={false}
      title="新增調撥庫存"
      titleAlign="left"
      statusTypeIconLayout="horizontal"
      open={open}
      showModalFooter
      showModalHeader
    >
      <TableModalBody setTargetStocks={setTargetStocks} />
    </Modal>
  );
};

export default TableModal;
