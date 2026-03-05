import { useRouter } from 'next/router';
import { Button, ButtonGroup } from '@mezzanine-ui/react';
import {
  SimpleReceiveInventoryOrderFragment,
  ReceiveInventoryOrderStatus,
} from '../../../../graphql/generated/.graphql';
import { NextPath } from '../../../../utils/nextpath';
import { nextDynamicPath } from '../../../../utils/path';

interface ActionsProps {
  source: SimpleReceiveInventoryOrderFragment;
}

const Actions: FC<ActionsProps> = ({ source }) => {
  const { push } = useRouter();

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
        disabled={source.status !== ReceiveInventoryOrderStatus.PENDING}
        // loading={loading}
        // onClick={async () => {

        // }}
      >
        刪除
      </Button>
    </ButtonGroup>
  );
};

export default Actions;
