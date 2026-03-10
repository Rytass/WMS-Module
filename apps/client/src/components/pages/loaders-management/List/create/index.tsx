import { useCallback, useMemo } from 'react';
import LoaderForm from '../Form';
import { FormValues } from '../Form/typing';

function CreateLoader() {
  const onSubmit = useCallback(async (values: FormValues) => {
    console.log('values', values);
  }, []);

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
