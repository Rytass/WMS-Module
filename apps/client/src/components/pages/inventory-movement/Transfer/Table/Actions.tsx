import { useCallback, useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Button, ButtonGroup } from '@mezzanine-ui/react';
import { TransferOrderFragment } from '../../../../../graphql/generated/.graphql';
import { useLazyQueryShipInventoryOrder } from '../../useApi';
import { NextPath } from '../../../../../utils/nextpath';
import { nextDynamicPath } from '../../../../../utils/path';
// import InventoryMovementShipForm from '../Form';
import { useDialog } from '../../../../dialog/useDialog';

interface ActionsProps {
  source: TransferOrderFragment;
}

const Actions: FC<ActionsProps> = ({ source }) => {
  const { push } = useRouter();
  const { openDialog } = useDialog();
  const [shipModalOpened, setShipModalOpened] = useState<boolean>(false);
  const { fetchShipInventoryOrder, data, loading } =
    useLazyQueryShipInventoryOrder();

  const shipInventoryOrder = useMemo(
    () =>
      shipModalOpened && !loading && data?.shipInventoryOrder
        ? data.shipInventoryOrder
        : null,
    [data?.shipInventoryOrder, loading, shipModalOpened],
  );

  useEffect(() => {
    if (shipModalOpened) {
      fetchShipInventoryOrder({
        variables: {
          shipInventoryOrderId: source.id,
        },
      });
    }
  }, [fetchShipInventoryOrder, shipModalOpened, source.id]);

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
      console.log('cancel');
    }
  }, [openDialog]);

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
            setShipModalOpened(true);
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
        >
          退回
        </Button>
      </ButtonGroup>
      {/* <InventoryMovementShipForm
        shipInventoryOrder={shipInventoryOrder}
        closeModal={() => {
          setShipModalOpened(false);
        }}
        open={!!shipInventoryOrder}
      /> */}
    </>
  );
};

export default Actions;
