import { LockIcon, UnlockIcon, LinkIcon, TrashIcon } from '@mezzanine-ui/icons';
import { SplitIcon, MergeIcon, UnlinkIcon } from '../../icons';
import { DropdownOption } from '@mezzanine-ui/react';
import { StockStatus } from '../../graphql/generated/.graphql';

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
  DeliverToCustomer = 'DeliverToCustomer',
  ReturnFromCustomer = 'ReturnFromCustomer',
  ScrapInventory = 'ScrapInventory',
}

export type InventoryActionItem = Omit<DropdownOption, 'id'> & {
  id: InventoryActions;
  status: StockStatus[];
  title: string;
  submitText: string;
  maxDataLength?: number;
};

export function inventoryActionsEnableStatus(
  action: InventoryActions,
): StockStatus[] {
  switch (action) {
    case InventoryActions.HoldInventory:
      return [StockStatus.FREE];

    case InventoryActions.ReleaseInventoryHold:
      return [StockStatus.HELD];

    case InventoryActions.AllocateInventory:
      return [StockStatus.FREE];

    case InventoryActions.DeallocateInventory:
      return [StockStatus.ALLOCATED];

    case InventoryActions.SplitBatch:
      return [StockStatus.FREE];

    case InventoryActions.MergeBatch:
      return [StockStatus.FREE];

    case InventoryActions.DeliverToCustomer:
      return [StockStatus.FREE, StockStatus.ALLOCATED];

    case InventoryActions.ReturnFromCustomer:
      return [StockStatus.CUSTOMER_INVENTORY];

    case InventoryActions.ScrapInventory:
      return [StockStatus.FREE, StockStatus.INSPECTION_FAILED];

    default:
      return [];
  }
}

export function isEnableActionStatus(
  inventoryStatus: StockStatus,
  conditionStatus?: StockStatus[],
): boolean {
  return (conditionStatus ?? []).includes(inventoryStatus);
}

export function inventoryActionsSpec(
  action: InventoryActions,
): InventoryActionItem | null {
  switch (action) {
    case InventoryActions.HoldInventory:
      return {
        id: action,
        name: '凍結',
        icon: LockIcon,
        title: '待凍結清單',
        submitText: '凍結',
        status: inventoryActionsEnableStatus(action),
      };

    case InventoryActions.ReleaseInventoryHold:
      return {
        id: action,
        name: '解除凍結',
        icon: UnlockIcon,
        title: '待解除凍結清單',
        submitText: '解除凍結',
        status: inventoryActionsEnableStatus(action),
      };

    case InventoryActions.AllocateInventory:
      return {
        id: action,
        name: '綁定銷售訂單',
        icon: LinkIcon,
        title: '待綁定銷售訂單',
        submitText: '綁定訂單',
        status: inventoryActionsEnableStatus(action),
      };

    case InventoryActions.DeallocateInventory:
      return {
        id: action,
        name: '解除綁定銷售訂單',
        icon: UnlinkIcon,
        title: '待解除綁定銷售訂單',
        submitText: '解除綁定',
        status: inventoryActionsEnableStatus(action),
      };

    case InventoryActions.SplitBatch:
      return {
        id: action,
        name: '拆分批號',
        icon: SplitIcon,
        title: '待拆分批號清單',
        submitText: '拆分批號',
        status: inventoryActionsEnableStatus(action),
        maxDataLength: 1,
      };

    case InventoryActions.MergeBatch:
      return {
        id: action,
        name: '合併批號',
        icon: MergeIcon,
        title: '待合併批號清單',
        submitText: '合併批號',
        status: inventoryActionsEnableStatus(action),
      };

    case InventoryActions.ScrapInventory:
      return {
        id: action,
        name: '報廢',
        icon: TrashIcon,
        title: '待報廢清單',
        submitText: '報廢',
        status: inventoryActionsEnableStatus(action),
      };

    default:
      return null;
  }
}

export const inventoryActionOptions: InventoryActionItem[] = [
  InventoryActions.HoldInventory,
  // InventoryActions.ReleaseInventoryHold,
  // InventoryActions.AllocateInventory,
  // InventoryActions.DeallocateInventory,
  // InventoryActions.SplitBatch,
  InventoryActions.MergeBatch,
  InventoryActions.ScrapInventory,
].map((action) => ({
  id: action,
  name: inventoryActionsSpec(action)?.name ?? '',
  icon: inventoryActionsSpec(action)?.icon,
  validate: inventoryActionsSpec(action)?.validate,
  status: inventoryActionsSpec(action)?.status ?? [],
  title: inventoryActionsSpec(action)?.title ?? '',
  submitText: inventoryActionsSpec(action)?.submitText ?? '',
  maxDataLength: inventoryActionsSpec(action)?.maxDataLength,
}));

export function haveAdditionalFields(currentAction: InventoryActions) {
  return [InventoryActions.MergeBatch].includes(currentAction);
}
