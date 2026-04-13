import { useMemo } from 'react';
import { useRouter } from 'next/router';
import TransferOrderForm from './Form';

function EditTransferOrder() {
  const { query, back } = useRouter();
  const id = useMemo(() => (query?.id as string) ?? '', [query.id]);

  return <TransferOrderForm title={`出庫單號：${id}`} breadcrumbTitle={id} />;
}

export default EditTransferOrder;
