import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import EditReceiveInventoryOrderForm from '../Form';
import { FormValues } from '../Form/typing';

function EditReceiveInventoryOrder() {
  const { query } = useRouter();
  const id = useMemo(() => (query?.id as string) ?? '', [query.id]);

  const onSubmit = useCallback(async (values: FormValues) => {
    console.log('values', values);
  }, []);

  const defaultValues = useMemo(
    (): FormValues => ({
      remark: '',
      items: [],
    }),
    [],
  );

  return (
    <EditReceiveInventoryOrderForm
      defaultValues={defaultValues}
      onSubmit={onSubmit}
      title={`入庫單號：${id}`}
      breadcrumbTitle={id}
      submitText="儲存"
    />
  );
}

export default EditReceiveInventoryOrder;
