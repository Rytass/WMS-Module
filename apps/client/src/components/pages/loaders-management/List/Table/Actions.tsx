import { useCallback, useState } from 'react';
import { Button, ButtonGroup } from '@mezzanine-ui/react';
import { LoaderFragment } from '../../../../../graphql/generated/.graphql';
import LoaderEditForm from '../EditForm';
import { FormValues } from '../EditForm/typing';

interface ActionsProps {
  source: LoaderFragment;
}

const Actions: FC<ActionsProps> = ({ source }) => {
  const [editModalOpened, setEditModalOpened] = useState<boolean>(false);

  const onSubmit = useCallback(async (values: FormValues) => {
    try {
      console.log('values', values);
    } catch (error) {
      console.error(error);
    }
  }, []);

  return (
    <>
      <ButtonGroup>
        <Button type="button" size="sub">
          查看庫存
        </Button>
        <Button
          type="button"
          size="sub"
          variant="base-secondary"
          onClick={() => {
            setEditModalOpened(true);
          }}
        >
          編輯
        </Button>
      </ButtonGroup>
      <LoaderEditForm
        title="編輯載具"
        mode="edit"
        defaultValues={{
          loaderType: {
            id: source.type.key,
            name: source.type.description,
          },
          typeKey: source.type.key,
          length: source.length,
          width: source.width,
          height: source.height,
          volume: source.volume,
          createdAt: source.createdAt,
          remark: source.note ?? '',
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
