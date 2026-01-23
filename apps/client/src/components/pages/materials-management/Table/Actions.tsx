import { Button, ButtonGroup } from '@mezzanine-ui/react';
import { SimpleMaterialFragment } from '../../../../graphql/generated/.graphql';

interface ActionsProps {
  source: SimpleMaterialFragment;
}

const Actions: FC<ActionsProps> = ({ source }) => {
  return (
    <ButtonGroup>
      <Button type="button" size="sub">
        編輯
      </Button>
      <Button type="button" size="sub" variant="destructive-secondary">
        停用
      </Button>
    </ButtonGroup>
  );
};

export default Actions;
