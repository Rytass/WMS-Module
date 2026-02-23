import { useCallback } from 'react';
import { useDialog } from '../dialog/useDialog';
import { useInventoryActions } from '../inventoryActions/useInventoryActions';

export function useClearAll() {
  const { resetAll } = useInventoryActions();
  const { openDialog } = useDialog();

  const onClearAll = useCallback(async () => {
    const isConfirm = await openDialog({
      modalStatusType: 'delete',
      title: '清空所有選項',
      supportingText: '清空後所有內容將永久移除且無法復原。確認要清空嗎？',
      cancelText: '取消',
      confirmText: '清空',
      confirmButtonProps: {
        variant: 'destructive-primary',
      },
    });

    if (isConfirm) {
      resetAll();
    }
  }, [resetAll, openDialog]);

  return onClearAll;
}
