import { LockIcon, UnlockIcon, LinkIcon, TrashIcon } from '@mezzanine-ui/icons';
import { SplitIcon, MergeIcon, UnlinkIcon } from '../icons';
import { DropdownOption } from '@mezzanine-ui/react';
import { StockStatus } from '../graphql/generated/.graphql';

export function stockStatusName(status?: StockStatus): string {
  switch (status) {
    case StockStatus.PENDING_INSPECTION:
      return '待檢驗';

    case StockStatus.INSPECTION_FAILED:
      return '檢驗失敗';

    case StockStatus.HELD:
      return '凍結中';

    case StockStatus.IN_TRANSFER:
      return '調撥中';

    case StockStatus.ALLOCATED:
      return '銷售訂單';

    case StockStatus.VENDOR_INVENTORY:
      return '供應商庫存';

    case StockStatus.CUSTOMER_INVENTORY:
      return '客戶倉';

    case StockStatus.FREE:
      return '未限制';

    default:
      return '';
  }
}

export enum InventoryActions {
  HoldInventory = 'HoldInventory',
  ReleaseInventoryHold = 'ReleaseInventoryHold',
  AllocateInventory = 'AllocateInventory',
  DeallocateInventory = 'DeallocateInventory',
  SplitBatch = 'SplitBatch',
  MergeBatch = 'MergeBatch',
  ScrapInventory = 'ScrapInventory',
}

export type InventoryActionItem = DropdownOption & {
  status: StockStatus[];
};

export function inventoryActionsSpec(
  action: InventoryActions,
): InventoryActionItem | null {
  switch (action) {
    case InventoryActions.HoldInventory:
      return {
        id: action,
        name: '凍結',
        icon: LockIcon,
        status: [StockStatus.FREE],
      };

    case InventoryActions.ReleaseInventoryHold:
      return {
        id: action,
        name: '解除凍結',
        icon: UnlockIcon,
        status: [StockStatus.HELD],
      };

    case InventoryActions.AllocateInventory:
      return {
        id: action,
        name: '綁定銷售訂單',
        icon: LinkIcon,
        status: [StockStatus.FREE],
      };

    case InventoryActions.DeallocateInventory:
      return {
        id: action,
        name: '解除綁定銷售訂單',
        icon: UnlinkIcon,
        status: [StockStatus.ALLOCATED],
      };

    case InventoryActions.SplitBatch:
      return {
        id: action,
        name: '拆分批號',
        icon: SplitIcon,
        status: [StockStatus.FREE],
      };

    case InventoryActions.MergeBatch:
      return {
        id: action,
        name: '合併批號',
        icon: MergeIcon,
        status: [StockStatus.FREE],
      };

    case InventoryActions.ScrapInventory:
      return {
        id: action,
        name: '報廢',
        icon: TrashIcon,
        validate: 'danger',
        status: [StockStatus.FREE, StockStatus.INSPECTION_FAILED],
      };

    default:
      return null;
  }
}

export const inventoryActionOptions: InventoryActionItem[] = [
  InventoryActions.HoldInventory,
  InventoryActions.ReleaseInventoryHold,
  InventoryActions.AllocateInventory,
  InventoryActions.DeallocateInventory,
  InventoryActions.SplitBatch,
  InventoryActions.MergeBatch,
  InventoryActions.ScrapInventory,
].map((action) => ({
  id: action,
  name: inventoryActionsSpec(action)?.name ?? '',
  icon: inventoryActionsSpec(action)?.icon,
  validate: inventoryActionsSpec(action)?.validate,
  status: inventoryActionsSpec(action)?.status ?? [],
}));
