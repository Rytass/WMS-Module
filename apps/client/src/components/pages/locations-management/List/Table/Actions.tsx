import { useCallback, useState } from 'react';
import { Button, ButtonGroup, Message } from '@mezzanine-ui/react';
import { LocationFragment } from '../../../../../graphql/generated/.graphql';
// import LoaderEditForm from '../EditForm';
// import { FormValues } from '../EditForm/typing';
import { useUpdateLocation } from '../../useApi';
// import StockTable from './StockTable';

interface ActionsProps {
  source: LocationFragment;
}

const Actions: FC<ActionsProps> = ({ source }) => {
  const [editModalOpened, setEditModalOpened] = useState<boolean>(false);

  const { updateLocation, loading: updateLoading } = useUpdateLocation();

  // const onSubmit = useCallback(
  //   async (values: FormValues) => {
  //     try {
  //       const { data } = await updateLoader({
  //         variables: {
  //           updateLoaderId: source.id,
  //           isActive: values.isActive === YesOrNo.YES,
  //           length: values.length,
  //           width: values.width,
  //           height: values.height,
  //           sizeUnit: values.sizeUnit?.name || '',
  //           volume: values.volume,
  //           volumeUnit: values.volumeUnit?.name || '',
  //           note: values.remark,
  //         },
  //       });

  //       if (data?.updateLoader.id) {
  //         Message.success('儲存成功');
  //       }
  //     } catch (error) {
  //       console.error(error);
  //     }
  //   },
  //   [source.id, updateLoader],
  // );

  return (
    <>
      <ButtonGroup>
        <Button
          type="button"
          size="sub"
          onClick={() => {
            //
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
      {/* <LoaderEditForm
        title="編輯載具"
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
          sizeUnit: source.sizeUnit
            ? {
                id: source.sizeUnit,
                name: source.sizeUnit,
              }
            : null,
          volume: source.volume,
          volumeUnit: source.volumeUnit
            ? {
                id: source.volumeUnit,
                name: source.volumeUnit,
              }
            : null,
          createdAt: source.createdAt,
          remark: source.note ?? '',
        }}
        onSubmit={onSubmit}
        submitText="儲存"
        closeModal={() => {
          setEditModalOpened(false);
        }}
        open={editModalOpened}
      /> */}
    </>
  );
};

export default Actions;
