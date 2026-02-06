import { useCallback } from 'react';
import CreateLoaderForm from '../Form';
import { FormValues } from '../Form/typing';

function CreateLoader() {
  const onSubmit = useCallback(async (values: FormValues) => {
    console.log('values', values);
  }, []);

  return (
    <CreateLoaderForm
      onSubmit={onSubmit}
      title="新增載具"
      breadcrumbTitle="新增載具"
      submitText="建立全部"
    />
  );
}

export default CreateLoader;
