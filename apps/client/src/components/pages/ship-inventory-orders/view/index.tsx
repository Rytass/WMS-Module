import { useMemo } from 'react';
import { useRouter } from 'next/router';
import ShipInventoryOrderForm from '../Form';
import { ShipInventoryOrderStatus } from '../../../../graphql/generated/.graphql';
import { FormValues } from '../Form/typing';

function ViewShipInventoryOrder() {
  const { query } = useRouter();
  const id = useMemo(() => (query?.id as string) ?? '', [query.id]);

  const defaultValues = useMemo(
    (): FormValues => ({
      remark: '',
      items: [],
    }),
    [],
  );

  return (
    <ShipInventoryOrderForm
      defaultValues={defaultValues}
      title={`出庫單號：${id}`}
      breadcrumbTitle={id}
      description="描述"
      createdBy="叮叮"
      createdAt="今天"
      status={ShipInventoryOrderStatus.PENDING}
      viewMode
    />
  );
}

export default ViewShipInventoryOrder;
