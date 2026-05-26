import { useCallback, useState } from 'react';
import { Button, Message } from '@mezzanine-ui/react';
import { LoaderTypeFragment } from '../../../../../graphql/generated/.graphql';
import LoaderTypeForm from '../Form';
import { FormValues, ActiveValue } from '../Form/typing';
import { useUpdateLoaderType } from '../../useApi';

interface ActionsProps {
  source: LoaderTypeFragment;
}

const Actions: FC<ActionsProps> = ({ source }) => {
  const [editModalOpened, setEditModalOpened] = useState<boolean>(false);

  const { updateLoaderType } = useUpdateLoaderType();

  const onSubmit = useCallback(
    async (values: FormValues) => {
      try {
        const { data } = await updateLoaderType({
          variables: {
            updateLoaderTypeId: source.id,
            description: values.description,
            isActive: values.isActive === ActiveValue.active,
          },
        });

        if (data?.updateLoaderType.id) {
          Message.success('儲存成功');
          setEditModalOpened(false);
        }
      } catch (error) {
        console.error(error);
      }
    },
    [source.id, updateLoaderType],
  );

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
          serial: source.key,
          isActive: source.isActive
            ? ActiveValue.active
            : ActiveValue.notActive,
        }}
        onSubmit={onSubmit}
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
