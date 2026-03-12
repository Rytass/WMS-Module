import { useEffect } from 'react';
import Loading from '../../../../Loading';
import InventoryMovementReceiveFormBody from './FormBody';
import { useLazyQueryReceiveInventoryOrder } from '../../useApi';

interface InventoryMovementReceiveFormProps {
  receiveInventoryOrderId: string;
  closeModal: VoidFunction;
  open: boolean;
}

function InventoryMovementReceiveForm({
  receiveInventoryOrderId,
  closeModal,
  open,
}: InventoryMovementReceiveFormProps) {
  const { fetchReceiveInventoryOrder, data, loading } =
    useLazyQueryReceiveInventoryOrder();

  useEffect(() => {
    if (open) {
      fetchReceiveInventoryOrder({
        variables: {
          receiveInventoryOrderId,
        },
      });
    }
  }, [fetchReceiveInventoryOrder, open, receiveInventoryOrderId]);

  // if (loading) {
  //   return <Loading />;
  // }

  return (
    <InventoryMovementReceiveFormBody
      defaultValues={{ test: '' }}
      closeModal={closeModal}
      open={open}
    />
  );
}

export default InventoryMovementReceiveForm;
