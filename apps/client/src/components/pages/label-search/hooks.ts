import { useCallback, useMemo } from 'react';
import { isEmpty } from 'lodash';
import { useDialog } from '../../dialog/useDialog';
import { useInventoryActions } from '../../inventoryActions/useInventoryActions';
import { isEnableActionStatus } from '../../../utils/inventoryActions';
import { AggregatedStockFragment } from '../../../graphql/generated/.graphql';

export function useClearAll() {
  const { resetAll } = useInventoryActions();
  const { openDialog } = useDialog();

  const onClearAll = useCallback(async () => {
    const isConfirm = await openDialog({
      modalStatusType: 'delete',
      title: '重置全部',
      supportingText: '重置後所有內容將永久移除且無法復原。確認要重置嗎？',
      cancelText: '取消',
      confirmText: '刪除',
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

export function useShareFooterProps(inventoryList: AggregatedStockFragment[]): {
  havePageFooter: true;
  haveCancelButton: boolean;
  supportingActionName: string;
  supportingActionOnClick: () => Promise<void>;
  disableSubmitButton: () => boolean;
} {
  const { targetAction, errorSignature } = useInventoryActions();
  const onClearAll = useClearAll();

  const haveError = useMemo(() => !isEmpty(errorSignature), [errorSignature]);

  return {
    havePageFooter: true,
    haveCancelButton: false,
    supportingActionName: '重置全部',
    supportingActionOnClick: onClearAll,
    disableSubmitButton: () =>
      haveError ||
      inventoryList.filter((item) =>
        isEnableActionStatus(item.status, targetAction?.status),
      ).length === 0,
  };
}
