import { useMemo } from 'react';
import { useRouter } from 'next/router';

function EditTransferOrder() {
  const { query, back } = useRouter();
  const id = useMemo(() => (query?.id as string) ?? '', [query.id]);

  return <div>TransferOrder</div>;
}

export default EditTransferOrder;
