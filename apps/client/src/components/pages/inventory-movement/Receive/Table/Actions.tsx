import { useState } from 'react';
import { Button } from '@mezzanine-ui/react';
import { ReceiveInventoryOrderFragment } from '../../../../../graphql/generated/.graphql';
import InventoryMovementReceiveForm from '../Form';

interface ActionsProps {
  source: ReceiveInventoryOrderFragment;
}

const Actions: FC<ActionsProps> = ({ source }) => {
  const [receiveModalOpened, setReceiveModalOpened] = useState<boolean>(false);

  return (
    <>
      <Button
        type="button"
        size="sub"
        variant="base-primary"
        onClick={() => {
          setReceiveModalOpened(true);
        }}
      >
        入庫
      </Button>
      <InventoryMovementReceiveForm
        receiveInventoryOrderId={source.id}
        closeModal={() => {
          setReceiveModalOpened(false);
        }}
        open={receiveModalOpened}
      />
    </>
  );
};

export default Actions;
