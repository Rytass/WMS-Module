import { useCallback } from 'react';
import { useWmsRouter } from '../router/context';
import { useDialog } from '../components/dialog/useDialog';

interface FormCancelProps {
  onCancel?: VoidFunction;
}

export function useFormCancel({ onCancel }: FormCancelProps) {
  const { openDialog } = useDialog();
  const { back } = useWmsRouter();

  const onFormCancel = useCallback(async () => {
    const isConfirm = await openDialog({
      title: '尚未儲存變更',
      supportingText: '您有尚未儲存的內容，確定要離開此頁嗎？',
      cancelText: '關閉提醒',
      confirmText: '離開此頁',
      confirmButtonProps: {
        variant: 'destructive-primary',
      },
    });

    if (isConfirm) {
      if (onCancel) {
        onCancel();
      } else {
        back();
      }
    }
  }, [back, onCancel, openDialog]);

  return onFormCancel;
}
