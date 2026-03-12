import { useCallback, useState } from 'react';
import { Button, Message } from '@mezzanine-ui/react';
import { ReceiveInventoryOrderFragment } from '../../../../../graphql/generated/.graphql';

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
    </>
  );
};

export default Actions;
