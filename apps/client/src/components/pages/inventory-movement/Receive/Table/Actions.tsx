import { useState, useMemo, useEffect } from 'react';
import { Button } from '@mezzanine-ui/react';
import { ReceiveInventoryOrderFragment } from '../../../../../graphql/generated/.graphql';
import { useLazyQueryReceiveInventoryOrder } from '../../useApi';
import InventoryMovementReceiveForm from '../Form';

interface ActionsProps {
  source: ReceiveInventoryOrderFragment;
}

const Actions: FC<ActionsProps> = ({ source }) => {
  const [receiveModalOpened, setReceiveModalOpened] = useState<boolean>(false);
  const { fetchReceiveInventoryOrder, data, loading } =
    useLazyQueryReceiveInventoryOrder();

  const receiveInventoryOrder = useMemo(
    () => data?.receiveInventoryOrder ?? null,
    [data?.receiveInventoryOrder],
  );

  useEffect(() => {
    if (receiveModalOpened) {
      fetchReceiveInventoryOrder({
        variables: {
          receiveInventoryOrderId: source.id,
        },
      });
    }
  }, [fetchReceiveInventoryOrder, receiveModalOpened, source.id]);

  return (
    <>
      <Button
        type="button"
        size="sub"
        variant="base-primary"
        disabled={loading}
        loading={loading}
        onClick={() => {
          setReceiveModalOpened(true);
        }}
      >
        入庫
      </Button>
      <InventoryMovementReceiveForm
        receiveInventoryOrder={receiveInventoryOrder}
        closeModal={() => {
          setReceiveModalOpened(false);
        }}
        open={receiveModalOpened && !!receiveInventoryOrder}
      />
    </>
  );
};

export default Actions;
