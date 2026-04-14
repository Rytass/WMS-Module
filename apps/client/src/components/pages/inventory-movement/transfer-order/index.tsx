import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { Message } from '@mezzanine-ui/react';
import Loading from '../../../Loading';
import TransferOrderForm from './Form';
import { FormValues } from './Form/typing';
import { useQueryTransferOrder } from '../useApi';
import { BASE_UNIT } from '../../../../utils/share';

function EditTransferOrder() {
  const { query, back } = useRouter();
  const id = useMemo(() => (query?.id as string) ?? '', [query.id]);

  const { data, loading } = useQueryTransferOrder(id);

  const transferOrder = useMemo(
    () => data?.transferOrder ?? null,
    [data?.transferOrder],
  );

  if (loading) {
    return <Loading />;
  }

  if (!transferOrder) {
    return null;
  }

  return (
    <TransferOrderForm
      defaultValues={{
        targetLocation: transferOrder.targetLocation
          ? {
              id: transferOrder.targetLocation.id,
              name: transferOrder.targetLocation.key,
            }
          : null,
        targetLoader: transferOrder.targetLoader
          ? {
              id: transferOrder.targetLoader.id,
              name: transferOrder.targetLoader.serialId,
            }
          : null,
        description: transferOrder.description || '',
        items: [],
      }}
      title={`出庫單號：${transferOrder.key}`}
      breadcrumbTitle={transferOrder.key}
      createdBy={transferOrder.createdBy}
      receiver={transferOrder.receiver}
      createdAt={transferOrder.createdAt}
    />
  );
}

export default EditTransferOrder;
