import { useCallback, useMemo } from 'react';
import { isEmpty } from 'lodash';
import { IconDefinition } from '@mezzanine-ui/icons';
import { useDialog } from '../dialog/useDialog';
import { useInventoryActions } from '../inventoryActions/useInventoryActions';
import { isEnableActionStatus } from '../inventoryActions/utils';
import { AggregatedStockFragment } from '../../graphql/generated/.graphql';

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

export function useShareFooterProps({
  inventoryList,
  onClose,
  open,
}: {
  inventoryList: AggregatedStockFragment[];
  onClose: VoidFunction;
  open: boolean;
}): {
  onClose: VoidFunction;
  open: boolean;
  headerTitle: string;
  bottomPrimaryActionText: string;
  bottomPrimaryActionIcon?: IconDefinition;
  bottomPrimaryActionDisabled: boolean;
  bottomOnGhostActionClick: () => Promise<void>;
} {
  const { targetAction, errorSignature } = useInventoryActions();
  const onClearAll = useClearAll();

  const haveError = useMemo(() => !isEmpty(errorSignature), [errorSignature]);

  return {
    onClose,
    open,
    headerTitle: targetAction?.title ?? '',
    bottomPrimaryActionText: targetAction?.submitText ?? '',
    bottomPrimaryActionIcon: targetAction?.icon,
    bottomPrimaryActionDisabled:
      haveError ||
      inventoryList.filter((item) =>
        isEnableActionStatus(item.status, targetAction?.status),
      ).length === 0,
    bottomOnGhostActionClick: onClearAll,
  };
}
