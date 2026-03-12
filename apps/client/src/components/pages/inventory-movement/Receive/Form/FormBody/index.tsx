import { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { FormModalWrapper } from '../../../../../fields/FormModalWrapper';
import { formSchema } from '../schema';
import { FormValues } from '../typing';
import classes from './index.module.scss';

interface InventoryMovementReceiveFormBodyProps {
  defaultValues: FormValues;
  closeModal: VoidFunction;
  open: boolean;
}

function InventoryMovementReceiveFormBody({
  defaultValues,
  closeModal,
  open,
}: InventoryMovementReceiveFormBodyProps) {
  const methods = useForm<FormValues>({
    resolver: yupResolver(formSchema),
    defaultValues,
  });

  const onSubmit = useCallback(async (values: FormValues) => {
    console.log('values', values);
  }, []);

  return (
    <FormModalWrapper<FormValues>
      methods={methods}
      title="入庫"
      confirmText="入庫"
      onSubmit={onSubmit}
      closeModal={closeModal}
      open={open}
      size="wide"
    >
      <div className={classes.host}>InventoryMovementReceiveFormBody</div>
    </FormModalWrapper>
  );
}

export default InventoryMovementReceiveFormBody;
