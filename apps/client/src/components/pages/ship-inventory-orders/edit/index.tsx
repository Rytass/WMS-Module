import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import ShipInventoryOrderForm from '../Form';
import { ShipInventoryOrderStatus } from '../../../../graphql/generated/.graphql';
import { FormValues } from '../Form/typing';

function EditShipInventoryOrder() {
  const { query } = useRouter();
  const id = useMemo(() => (query?.id as string) ?? '', [query.id]);

  const onSubmit = useCallback(async (values: FormValues) => {
    console.log('values', values);
  }, []);

  const defaultValues = useMemo(
    (): FormValues => ({
      remark: '',
      references: [],
    }),
    [],
  );

  return (
    <ShipInventoryOrderForm
      defaultValues={defaultValues}
      onSubmit={onSubmit}
      title={`出庫單號：${id}`}
      breadcrumbTitle={id}
      description="描述"
      createdBy="叮叮"
      createdAt="今天"
      status={ShipInventoryOrderStatus.PENDING}
      submitText="儲存"
      viewMode={false}
    />
  );
}

export default EditShipInventoryOrder;
