import { useCallback, useState } from 'react';
import { Button, ButtonGroup, Message } from '@mezzanine-ui/react';
import { LocationFragment } from '../../../../../graphql/generated/.graphql';
import LocationFormModal from '../../FormModal';
import { FormValues } from '../../FormModal/typing';
import { useUpdateLocation } from '../../useApi';

interface ActionsProps {
  source: LocationFragment;
}

const Actions: FC<ActionsProps> = ({ source }) => {
  const [editModalOpened, setEditModalOpened] = useState<boolean>(false);

  const { updateLocation, loading: updateLoading } = useUpdateLocation();

  const onEdit = useCallback(async (values: FormValues) => {
    try {
      console.log('values', values);
    } catch (error) {
      console.error(error);
    }
  }, []);

  return (
    <>
      <ButtonGroup>
        <Button
          type="button"
          size="sub"
          onClick={() => {
            setEditModalOpened(true);
          }}
        >
          編輯
        </Button>
        {source.isActive ? (
          <Button
            type="button"
            size="sub"
            variant="destructive-secondary"
            loading={updateLoading}
            onClick={async () => {
              try {
                if (!updateLoading) {
                  await updateLocation({
                    variables: {
                      updateLocationId: source.id,
                      isActive: false,
                    },
                  });
                }
              } catch (error) {
                console.error(error);
              }
            }}
          >
            停用
          </Button>
        ) : (
          <Button
            type="button"
            size="sub"
            variant="base-secondary"
            loading={updateLoading}
            onClick={async () => {
              try {
                if (!updateLoading) {
                  await updateLocation({
                    variables: {
                      updateLocationId: source.id,
                      isActive: true,
                    },
                  });
                }
              } catch (error) {
                console.error(error);
              }
            }}
          >
            啟用
          </Button>
        )}
      </ButtonGroup>
      <LocationFormModal
        title="編輯庫位"
        defaultValues={{
          description: source.description,
          parentLocation: null,
        }}
        submitText="儲存"
        onSubmit={onEdit}
        closeModal={() => {
          setEditModalOpened(false);
        }}
        open={editModalOpened}
        confirmMode="edit"
      />
    </>
  );
};

export default Actions;
