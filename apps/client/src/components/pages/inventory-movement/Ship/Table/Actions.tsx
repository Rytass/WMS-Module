import { useCallback, useState, useMemo, useEffect } from 'react';
import { Button, ButtonGroup } from '@mezzanine-ui/react';
import { ShipInventoryOrderFragment } from '../../../../../graphql/generated/.graphql';
import { useLazyQueryShipInventoryOrder } from '../../useApi';
import InventoryMovementShipForm from '../Form';
import { useDialog } from '../../../../dialog/useDialog';

interface ActionsProps {
  source: ShipInventoryOrderFragment;
}

const Actions: FC<ActionsProps> = ({ source }) => {
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
      modalStatusType: 'delete',
      title: '取消出庫',
      supportingText:
        '取消出庫後，將撤銷此筆出庫紀錄，庫存數量將回復至出庫前狀態。確定要取消出庫嗎？',
      cancelText: '取消',
      confirmText: '取消出庫',
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
          出庫
        </Button>
        <Button
          type="button"
          size="sub"
          variant="base-secondary"
          onClick={onCancel}
        >
          取消
        </Button>
      </ButtonGroup>
      <InventoryMovementShipForm
        shipInventoryOrder={shipInventoryOrder}
        closeModal={() => {
          setShipModalOpened(false);
        }}
        open={!!shipInventoryOrder}
      />
    </>
  );
};

export default Actions;
