import { useState, useCallback } from 'react';
import { Button, ButtonGroup, Message } from '@mezzanine-ui/react';
import {
  SimpleMaterialFragment,
  MaterialsDocument,
} from '../../../../graphql/generated/.graphql';
import { useUpdateMaterial } from '../useApi';
import MaterialsManagementForm from '../Form';
import { FormValues } from '../Form/typing';

interface ActionsProps {
  source: SimpleMaterialFragment;
}

const Actions: FC<ActionsProps> = ({ source }) => {
  const [editModalOpened, setEditModalOpened] = useState<boolean>(false);

  const { updateMaterial, loading } = useUpdateMaterial();

  const onSubmit = useCallback(
    async (values: FormValues) => {
      try {
        const { data } = await updateMaterial({
          variables: {
            updateMaterialId: source.id,
            description: values.description,
            units: values.units.map((u) => ({
              unit: u.unit,
              conversionFactor: u.conversionFactor ?? 0,
              isActive: u.isActive,
            })),
            isActive: source.isActive,
          },
          refetchQueries: [MaterialsDocument],
        });

        if (data?.updateMaterial.id) {
          Message.success('儲存成功');
          setEditModalOpened(false);
        }
      } catch (error) {
        console.error(error);
      }
    },
    [source.id, source.isActive, updateMaterial],
  );

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
          baseUnit: source.baseUnit?.key,
          units: source.materialUnits.map((unit) => ({
            unit: unit.unit,
            conversionFactor: unit.conversionFactor,
            isExisted: true,
            isActive: unit.isActive,
          })),
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
