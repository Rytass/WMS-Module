import { useMutation } from '@apollo/client/react';
import { Button, ButtonGroup } from '@mezzanine-ui/react';
import {
  SimpleMaterialFragment,
  MaterialsDocument,
  UpdateMaterialDocument,
} from '../../../../graphql/generated/.graphql';

interface ActionsProps {
  source: SimpleMaterialFragment;
}

const Actions: FC<ActionsProps> = ({ source }) => {
  const [updateMaterial] = useMutation(UpdateMaterialDocument, {
    refetchQueries: [MaterialsDocument],
  });

  return (
    <ButtonGroup>
      <Button type="button" size="sub">
        編輯
      </Button>
      {source.isActive ? (
        <Button
          type="button"
          size="sub"
          variant="destructive-secondary"
          onClick={async () => {
            try {
              const { data } = await updateMaterial({
                variables: {
                  updateMaterialId: source.id,
                  isActive: false,
                },
              });
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
          onClick={async () => {
            try {
              const { data } = await updateMaterial({
                variables: {
                  updateMaterialId: source.id,
                  isActive: true,
                },
              });
            } catch (error) {
              console.error(error);
            }
          }}
        >
          啟用
        </Button>
      )}
    </ButtonGroup>
  );
};

export default Actions;
