import { Button, ButtonGroup } from '@mezzanine-ui/react';
import { LoaderFragment } from '../../../../../graphql/generated/.graphql';

interface ActionsProps {
  source: LoaderFragment;
}

const Actions: FC<ActionsProps> = ({ source }) => {
  return (
    <ButtonGroup>
      <Button type="button" size="sub">
        查看庫存
      </Button>
      <Button type="button" size="sub" variant="base-secondary">
        編輯
      </Button>
    </ButtonGroup>
  );
};

export default Actions;
