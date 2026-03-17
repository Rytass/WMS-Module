import { Button, ButtonGroup } from '@mezzanine-ui/react';
import { ShipInventoryOrderFragment } from '../../../../../graphql/generated/.graphql';

interface ActionsProps {
  source: ShipInventoryOrderFragment;
}

const Actions: FC<ActionsProps> = ({ source }) => {
  return (
    <>
      <ButtonGroup>
        <Button type="button" size="sub" variant="base-primary">
          出庫
        </Button>
        <Button type="button" size="sub" variant="base-secondary">
          取消
        </Button>
      </ButtonGroup>
    </>
  );
};

export default Actions;
