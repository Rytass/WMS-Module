import { useCallback, useState, useMemo, useEffect } from 'react';
import { useWmsRouter } from '../../../../../router/context';
import { Button, ButtonGroup, Message } from '@mezzanine-ui/react';
import { TransferOrderFragment } from '../../../../../graphql/generated/.graphql';
import { useLazyQueryTransferOrder, useCancelTransfer } from '../../useApi';
import { NextPath } from '../../../../../utils/nextpath';
import { nextDynamicPath } from '../../../../../utils/path';
import InventoryMovementTransferForm from '../Form';
import { useDialog } from '../../../../dialog/useDialog';

interface ActionsProps {
  source: TransferOrderFragment;
}

const Actions: FC<ActionsProps> = ({ source }) => {
  const { push } = useWmsRouter();
  const { openDialog } = useDialog();
  const [transferModalOpened, setTransferModalOpened] =
    useState<boolean>(false);
  const { fetchTransferOrder, data, loading } = useLazyQueryTransferOrder();
  const { cancelTransfer, loading: cancelLoading } = useCancelTransfer();

  const transferOrder = useMemo(
    () =>
      transferModalOpened && !loading && data?.transferOrder
        ? data.transferOrder
        : null,
    [data?.transferOrder, loading, transferModalOpened],
  );

  useEffect(() => {
    if (transferModalOpened) {
      fetchTransferOrder({
        variables: {
          transferOrderId: source.id,
        },
      });
    }
  }, [fetchTransferOrder, transferModalOpened, source.id]);

  const onCancel = useCallback(async () => {
    const isConfirm = await openDialog({
      modalStatusType: 'error',
      title: '退回項目',
      supportingText:
        '退回後庫存將保留於來源位置，並且取消本次調撥，確認要退回嗎？',
      cancelText: '取消',
      confirmText: '退回',
      confirmButtonProps: {
        variant: 'destructive-primary',
      },
    });

    if (isConfirm) {
      try {
        const { data } = await cancelTransfer({
          variables: {
            items: source.items.map((item) => ({
              itemId: item.id,
            })),
          },
        });

        if (data?.cancelTransfer) {
          Message.success('退回項目成功');
        }
      } catch (error) {
        console.error(error);
      }
    }
  }, [cancelTransfer, openDialog, source.items]);

  return (
    <>
      <ButtonGroup>
        <Button
          type="button"
          size="sub"
          variant="base-primary"
          disabled={loading}
          loading={loading}
          onClick={() => {
            setTransferModalOpened(true);
          }}
        >
          對點
        </Button>
        <Button
          type="button"
          size="sub"
          variant="base-secondary"
          onClick={() => {
            push(
              nextDynamicPath(NextPath.INVENTORYMOVEMENT_TRANSFERORDER_ID, {
                '[id]': source.id,
              }),
            );
          }}
        >
          編輯
        </Button>
        <Button
          type="button"
          size="sub"
          variant="destructive-secondary"
          onClick={onCancel}
          loading={cancelLoading}
          disabled={cancelLoading}
        >
          退回
        </Button>
      </ButtonGroup>
      <InventoryMovementTransferForm
        transferOrder={transferOrder}
        closeModal={() => {
          setTransferModalOpened(false);
        }}
        open={!!transferOrder}
      />
    </>
  );
};

export default Actions;
