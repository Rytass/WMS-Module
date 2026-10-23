import dayjs from 'dayjs';
import { useWmsRouter } from '../../../../router/context';
import { Button, ButtonGroup, Message } from '@mezzanine-ui/react';
import {
  SimpleReceiveInventoryOrderFragment,
  ReceiveInventoryOrderStatus,
} from '../../../../graphql/generated/.graphql';
import { NextPath } from '../../../../utils/nextpath';
import { nextDynamicPath } from '../../../../utils/path';
import { useDialog } from '../../../dialog/useDialog';
import { useUpdateReceiveInventoryOrder } from '../useApi';

interface ActionsProps {
  source: SimpleReceiveInventoryOrderFragment;
}

const Actions: FC<ActionsProps> = ({ source }) => {
  const { push } = useWmsRouter();
  const { openDialog } = useDialog();
  const { updateReceiveInventoryOrder, loading } =
    useUpdateReceiveInventoryOrder();

  return (
    <ButtonGroup>
      {[
        ReceiveInventoryOrderStatus.REMOVED,
        ReceiveInventoryOrderStatus.RECEIVED,
      ].includes(source.status) ? (
        <Button
          type="button"
          size="sub"
          onClick={() => {
            push(
              nextDynamicPath(NextPath.RECEIVEINVENTORYORDERS_ID_VIEW, {
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
              nextDynamicPath(NextPath.RECEIVEINVENTORYORDERS_ID_EDIT, {
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
        disabled={
          source.status !== ReceiveInventoryOrderStatus.PENDING || loading
        }
        loading={loading}
        onClick={async () => {
          const isConfirm = await openDialog({
            modalStatusType: 'delete',
            title: '刪除入庫單',
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
              const { data } = await updateReceiveInventoryOrder({
                variables: {
                  updateReceiveInventoryOrderId: source.id,
                  removedAt: dayjs().toISOString(),
                },
              });

              if (data?.updateReceiveInventoryOrder.id) {
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
