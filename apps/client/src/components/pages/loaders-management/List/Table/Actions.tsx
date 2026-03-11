import { useCallback, useState } from 'react';
import { Button, ButtonGroup } from '@mezzanine-ui/react';
import { LoaderFragment } from '../../../../../graphql/generated/.graphql';
import LoaderEditForm from '../EditForm';
import { FormValues } from '../EditForm/typing';
import { useModal } from '../../../../modal/useModal';
import { YesOrNo } from '../../../../../utils/share';
import StockTable from './StockTable';

interface ActionsProps {
  source: LoaderFragment;
}

const Actions: FC<ActionsProps> = ({ source }) => {
  const [editModalOpened, setEditModalOpened] = useState<boolean>(false);
  const { openModal, closeModal } = useModal();

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
        <Button
          type="button"
          size="sub"
          onClick={() => {
            openModal({
              title: '載具內容',
              titleAlign: 'left',
              size: 'wide',
              cancelButtonProps: {
                style: {
                  display: 'none',
                },
              },
              confirmText: '關閉',
              onConfirm: closeModal,
              children: <StockTable loaderId={source.id} />,
            });
          }}
        >
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
          isActive: source.isActive ? YesOrNo.YES : YesOrNo.NO,
          loaderType: {
            id: source.type.key,
            name: source.type.description,
          },
          typeKey: source.type.key,
          location: {
            id: source.location.id,
            name: source.location.key,
          },
          length: source.length,
          width: source.width,
          height: source.height,
          sizeUnit: {
            id: source.sizeUnit || '',
            name: source.sizeUnit || '',
          },
          volume: source.volume,
          volumeUnit: {
            id: source.volumeUnit || '',
            name: source.volumeUnit || '',
          },
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
