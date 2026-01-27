import { Button } from '@mezzanine-ui/react';
import { LoaderTypeFragment } from '../../../../../graphql/generated/.graphql';

interface ActionsProps {
  source: LoaderTypeFragment;
}

const Actions: FC<ActionsProps> = ({ source }) => {
  return (
    <Button type="button" size="sub" variant="base-primary">
      編輯
    </Button>
  );
};

export default Actions;
