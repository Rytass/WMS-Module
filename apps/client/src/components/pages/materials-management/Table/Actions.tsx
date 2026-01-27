import { useState } from 'react';
import { Button, ButtonGroup } from '@mezzanine-ui/react';
import { SimpleMaterialFragment } from '../../../../graphql/generated/.graphql';
import { useUpdateMaterial } from '../useApi';
import MaterialsManagementForm from '../Form';

interface ActionsProps {
  source: SimpleMaterialFragment;
}

const Actions: FC<ActionsProps> = ({ source }) => {
  const [editModalOpened, setEditModalOpened] = useState<boolean>(false);

  const { updateMaterial, loading } = useUpdateMaterial();

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
            loading={loading}
            onClick={async () => {
              try {
                if (!loading) {
                  await updateMaterial({
                    variables: {
                      updateMaterialId: source.id,
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
            loading={loading}
            onClick={async () => {
              try {
                if (!loading) {
                  await updateMaterial({
                    variables: {
                      updateMaterialId: source.id,
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
      <MaterialsManagementForm
        title="編輯料號"
        mode="edit"
        defaultValues={{
          materialNumber: source.key,
          description: source.description,
          baseUnit: source.baseUnit,
          units: source.materialUnits.map((unit) => ({
            unit: unit.unit,
            conversionFactor: unit.conversionFactor,
          })),
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
