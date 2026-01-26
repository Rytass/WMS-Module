import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Button, ButtonGroup } from '@mezzanine-ui/react';
import { useDialog } from '../../../../components/dialog/useDialog';
import {
  SimpleMaterialFragment,
  MaterialsDocument,
  UpdateMaterialDocument,
} from '../../../../graphql/generated/.graphql';
import MaterialsManagementForm from '../Form';

interface ActionsProps {
  source: SimpleMaterialFragment;
}

const Actions: FC<ActionsProps> = ({ source }) => {
  const [editModalOpened, setEditModalOpened] = useState<boolean>(false);
  const { openDialog } = useDialog();

  const [updateMaterial] = useMutation(UpdateMaterialDocument, {
    refetchQueries: [MaterialsDocument],
  });

  return (
    <>
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
                await updateMaterial({
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
                await updateMaterial({
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
      <MaterialsManagementForm
        title="編輯料號"
        onSubmit={async (values) => {
          const isConfirm = await openDialog({
            modalStatusType: 'info',
            title: '確認儲存變更',
            supportingText:
              '您即將編輯設定流程，完成後系統將自動應用相關變更。請確認是否要繼續，以便順利完成操作。',
            cancelText: '取消',
            confirmText: '套用變更',
          });

          if (isConfirm) {
            console.log('values', values);
          }
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
