import { useCallback, useState } from 'react';
import { Modal, Message } from '@mezzanine-ui/react';
import TableModalBody from './TableModalBody';
import { AggregatedStockFragment } from '../../../../../graphql/generated/.graphql';
import {
  InventoryActions,
  inventoryActionsSpec,
} from '../../../../inventoryActions/utils';

interface TableModalProps {
  open: boolean;
  closeModal: VoidFunction;
}

const TableModal: FC<TableModalProps> = ({ open, closeModal }) => {
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
      console.log('新增', targetStocks);
    }
  }, [targetStocks]);

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
