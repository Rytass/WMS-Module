import dayjs from 'dayjs';
import { useRouter } from 'next/router';
import { Button, ButtonGroup, Message } from '@mezzanine-ui/react';
import {
  SimpleShipInventoryOrderFragment,
  ShipInventoryOrderStatus,
} from '../../../../graphql/generated/.graphql';
import { NextPath } from '../../../../utils/nextpath';
import { nextDynamicPath } from '../../../../utils/path';
import { useDialog } from '../../../dialog/useDialog';
import { useUpdateShipInventoryOrder } from '../useApi';

interface ActionsProps {
  source: SimpleShipInventoryOrderFragment;
}

const Actions: FC<ActionsProps> = ({ source }) => {
  const { push } = useRouter();
  const { openDialog } = useDialog();
  const { updateShipInventoryOrder, loading } = useUpdateShipInventoryOrder();

  return (
    <ButtonGroup>
      {[
        ShipInventoryOrderStatus.REMOVED,
        ShipInventoryOrderStatus.SHIPPED,
      ].includes(source.status) ? (
        <Button
          type="button"
          size="sub"
          onClick={() => {
            push(
              nextDynamicPath(NextPath.SHIPINVENTORYORDERS_ID_VIEW, {
                '[id]': source.id,
              }),
            );
          }}
        >
          檢視
        </Button>
      ) : (
        <Button
          type="button"
          size="sub"
          onClick={() => {
            push(
              nextDynamicPath(NextPath.SHIPINVENTORYORDERS_ID_EDIT, {
                '[id]': source.id,
              }),
            );
          }}
        >
          編輯
        </Button>
      )}
      <Button
        type="button"
        size="sub"
        variant="destructive-secondary"
        disabled={source.status !== ShipInventoryOrderStatus.PENDING || loading}
        loading={loading}
        onClick={async () => {
          const isConfirm = await openDialog({
            modalStatusType: 'delete',
            title: '刪除出庫單',
            supportingText:
              '刪除後所有內容將永久移除且無法復原。確認要刪除嗎？',
            cancelText: '取消',
            confirmText: '刪除',
            confirmButtonProps: {
              variant: 'destructive-primary',
            },
          });

          if (isConfirm) {
            try {
              const { data } = await updateShipInventoryOrder({
                variables: {
                  updateShipInventoryOrderId: source.id,
                  removedAt: dayjs().toISOString(),
                },
              });

              if (data?.updateShipInventoryOrder.id) {
                Message.success('已成功移除項目');
              }
            } catch (error) {
              console.error(error);
            }
          }
        }}
      >
        刪除
      </Button>
    </ButtonGroup>
  );
};

export default Actions;
