import { useCallback } from 'react';
import { FieldValues, SubmitHandler, useFormContext } from 'react-hook-form';
import { useRouter } from 'next/router';
import { useDialog } from '../components/dialog/useDialog';

interface FormCancelProps<T extends FieldValues = FieldValues> {
  onSubmit: SubmitHandler<T>;
  onCancel?: VoidFunction;
}

export function useFormCancel<T extends FieldValues>({
  onSubmit,
  onCancel,
}: FormCancelProps<T>) {
  const { openDialog } = useDialog();
  const { back } = useRouter();
  const { handleSubmit } = useFormContext<T>();

  const onFormCancel = useCallback(async () => {
    const isConfirm = await openDialog({
      title: '尚未儲存變更',
      children: '您有尚未儲存的內容，確定要離開此頁嗎？',
      cancelText: '放棄變更',
      confirmText: '儲存變更',
    });

    if (isConfirm) {
      await handleSubmit(onSubmit)();
    } else {
      if (onCancel) {
        onCancel();
      } else {
        back();
      }
    }
  }, [back, handleSubmit, onCancel, onSubmit, openDialog]);

  return onFormCancel;
}
