import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { Message } from '@mezzanine-ui/react';
import LoaderForm from '../Form';
import { FormValues } from '../Form/typing';
import { useCreateBatchLoader } from '../../useApi';

function CreateLoader() {
  const { back } = useRouter();
  const { createBatchLoader } = useCreateBatchLoader();

  const onSubmit = useCallback(
    async (values: FormValues) => {
      try {
        const { data } = await createBatchLoader({
          variables: {
            items: values.items.map((item) => ({
              typeKey: item.typeKey,
              locationId: item.location?.id || '',
              quantity: item.quantity,
              length: item.length,
              width: item.width,
              height: item.height,
              sizeUnit: item.sizeUnit?.name || '',
              volume: item.volume,
              volumeUnit: item.volumeUnit?.name || '',
              note: item.remark || '',
            })),
          },
        });

        if (data?.createBatchLoader?.[0].id) {
          Message.success('已成功新增項目');
          back();
        }
      } catch (error) {
        console.error(error);
      }
    },
    [back, createBatchLoader],
  );

  const defaultValues = useMemo(
    (): FormValues => ({
      items: [],
    }),
    [],
  );

  return (
    <LoaderForm
      defaultValues={defaultValues}
      onSubmit={onSubmit}
      title="新增載具"
      breadcrumbTitle="新增載具"
      submitText="建立全部"
    />
  );
}

export default CreateLoader;
