import { useState } from 'react';
import { Button } from '@mezzanine-ui/react';
import { LoaderTypeFragment } from '../../../../../graphql/generated/.graphql';
import LoaderTypeForm from '../Form';

interface ActionsProps {
  source: LoaderTypeFragment;
}

const Actions: FC<ActionsProps> = ({ source }) => {
  const [editModalOpened, setEditModalOpened] = useState<boolean>(false);

  return (
    <>
      <Button
        type="button"
        size="sub"
        variant="base-primary"
        onClick={() => {
          setEditModalOpened(true);
        }}
      >
        編輯
      </Button>
      <LoaderTypeForm
        title="編輯載具類型"
        mode="edit"
        defaultValues={{
          description: source.description,
          serial: source.serial,
          isActive: source.isActive,
        }}
        onSubmit={async (values) => {
          console.log('values', values);
        }}
        submitText="儲存"
        closeModal={() => {
          setEditModalOpened(false);
        }}
        open={editModalOpened}
      />
    </>
  );
};

export default Actions;
