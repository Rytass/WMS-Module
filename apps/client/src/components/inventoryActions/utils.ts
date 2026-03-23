import {
  PlusIcon,
  LockIcon,
  UnlockIcon,
  LinkIcon,
  RefreshCwIcon,
  BoxIcon,
  DoubleChevronLeftIcon,
  ReverseRightIcon,
  CheckedOutlineIcon,
  TrashIcon,
} from '@mezzanine-ui/icons';
import {
  CarIcon,
  SplitIcon,
  MergeIcon,
  UnlinkIcon,
  UpRightIcon,
} from '../../icons';
import { DropdownOption } from '@mezzanine-ui/react';
import { AggregatedStockFragment } from '../../graphql/generated/.graphql';
import { StockStatus } from '../../graphql/generated/.graphql';
import { InventorySignature } from './typing';

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

    case StockStatus.IN_SHIPMENT:
      return '出庫中';

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
  CreateTransferInventory = 'CreateTransferInventory',
  HoldInventory = 'HoldInventory',
  ReleaseInventoryHold = 'ReleaseInventoryHold',
  AllocateInventory = 'AllocateInventory',
  DeallocateInventory = 'DeallocateInventory',
  ShipInventory = 'ShipInventory',
  SplitBatch = 'SplitBatch',
  MergeBatch = 'MergeBatch',
  ReclassifyInventory = 'ReclassifyInventory',
  TransferToVendor = 'TransferToVendor',
  ReturnFromVendor = 'ReturnFromVendor',
  QualityInspection = 'QualityInspection',
  DeliverToCustomer = 'DeliverToCustomer',
  ReturnFromCustomer = 'ReturnFromCustomer',
  ScrapInventory = 'ScrapInventory',
}

export type InventoryActionItem = Omit<DropdownOption, 'id'> & {
  id: InventoryActions;
  status: StockStatus[];
  title: string;
  submitText: string;
  needSameMaterial?: boolean;
  maxDataLength?: number;
};

export function inventoryActionsEnableStatus(
  action: InventoryActions,
): StockStatus[] {
  switch (action) {
    case InventoryActions.CreateTransferInventory:
      return [
        StockStatus.FREE,
        StockStatus.PENDING_INSPECTION,
        StockStatus.INSPECTION_FAILED,
        StockStatus.ALLOCATED,
      ];

    case InventoryActions.HoldInventory:
      return [StockStatus.FREE];

    case InventoryActions.ReleaseInventoryHold:
      return [StockStatus.HELD];

    case InventoryActions.AllocateInventory:
      return [StockStatus.FREE];

    case InventoryActions.DeallocateInventory:
      return [StockStatus.ALLOCATED];

    case InventoryActions.ShipInventory:
      return [
        StockStatus.FREE,
        StockStatus.INSPECTION_FAILED,
        StockStatus.ALLOCATED,
        StockStatus.VENDOR_INVENTORY,
        StockStatus.CUSTOMER_INVENTORY,
      ];

    case InventoryActions.SplitBatch:
      return [StockStatus.FREE];

    case InventoryActions.MergeBatch:
      return [StockStatus.FREE];

    case InventoryActions.ReclassifyInventory:
      return [StockStatus.FREE, StockStatus.INSPECTION_FAILED];

    case InventoryActions.TransferToVendor:
      return [StockStatus.FREE];

    case InventoryActions.ReturnFromVendor:
      return [StockStatus.VENDOR_INVENTORY];

    case InventoryActions.QualityInspection:
      return [StockStatus.PENDING_INSPECTION];

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
  const baseProps = {
    id: action,
    status: inventoryActionsEnableStatus(action),
  };

  switch (action) {
    case InventoryActions.CreateTransferInventory:
      return {
        ...baseProps,
        name: '加入待調撥清單',
        icon: PlusIcon,
        title: '待調撥清單',
        submitText: '建立調撥',
      };

    case InventoryActions.HoldInventory:
      return {
        ...baseProps,
        name: '凍結',
        icon: LockIcon,
        title: '待凍結清單',
        submitText: '凍結',
      };

    case InventoryActions.ReleaseInventoryHold:
      return {
        ...baseProps,
        name: '解除凍結',
        icon: UnlockIcon,
        title: '待解除凍結清單',
        submitText: '解除凍結',
      };

    case InventoryActions.AllocateInventory:
      return {
        ...baseProps,
        name: '綁定銷售訂單',
        icon: LinkIcon,
        title: '待綁定銷售訂單',
        submitText: '綁定訂單',
      };

    case InventoryActions.DeallocateInventory:
      return {
        ...baseProps,
        name: '解除綁定銷售訂單',
        icon: UnlinkIcon,
        title: '待解除綁定銷售訂單',
        submitText: '解除綁定',
      };

    case InventoryActions.ShipInventory:
      return {
        ...baseProps,
        name: '出庫',
        icon: CarIcon,
        title: '待出庫清單',
        submitText: '建立出庫',
      };

    case InventoryActions.SplitBatch:
      return {
        ...baseProps,
        name: '拆分批號',
        icon: SplitIcon,
        title: '待拆分批號清單',
        submitText: '拆分批號',
        maxDataLength: 1,
      };

    case InventoryActions.MergeBatch:
      return {
        ...baseProps,
        name: '合併批號',
        icon: MergeIcon,
        title: '待合併批號清單',
        submitText: '合併批號',
        needSameMaterial: true,
      };

    case InventoryActions.ReclassifyInventory:
      return {
        ...baseProps,
        name: '轉料號',
        icon: RefreshCwIcon,
        title: '待轉料號清單',
        submitText: '轉料號',
      };

    case InventoryActions.TransferToVendor:
      return {
        ...baseProps,
        name: '調撥至供應商',
        icon: UpRightIcon,
        title: '待調撥至供應商清單',
        submitText: '調撥至供應商',
      };

    case InventoryActions.ReturnFromVendor:
      return {
        ...baseProps,
        name: '供應商庫存回廠',
        icon: ReverseRightIcon,
        title: '待供應商庫存回廠清單',
        submitText: '供應商庫存回廠',
      };

    case InventoryActions.QualityInspection:
      return {
        ...baseProps,
        name: '檢驗',
        icon: CheckedOutlineIcon,
        title: '待檢驗清單',
        submitText: '通過',
      };

    case InventoryActions.DeliverToCustomer:
      return {
        ...baseProps,
        name: '發至客戶倉',
        icon: BoxIcon,
        title: '待發至客戶倉清單',
        submitText: '發至客戶倉',
      };

    case InventoryActions.ReturnFromCustomer:
      return {
        ...baseProps,
        name: '客戶倉回廠',
        icon: DoubleChevronLeftIcon,
        title: '待客戶倉回廠清單',
        submitText: '客戶倉回廠',
      };

    case InventoryActions.ScrapInventory:
      return {
        ...baseProps,
        name: '報廢',
        icon: TrashIcon,
        title: '待報廢清單',
        submitText: '報廢',
      };

    default:
      return null;
  }
}

export const inventoryActionOptions: InventoryActionItem[] = [
  InventoryActions.CreateTransferInventory,
  InventoryActions.HoldInventory,
  InventoryActions.ReleaseInventoryHold,
  InventoryActions.AllocateInventory,
  InventoryActions.DeallocateInventory,
  // InventoryActions.ShipInventory,
  InventoryActions.SplitBatch,
  InventoryActions.MergeBatch,
  // InventoryActions.ReclassifyInventory,
  // InventoryActions.TransferToVendor,
  InventoryActions.ReturnFromVendor,
  // InventoryActions.QualityInspection,
  // InventoryActions.DeliverToCustomer,
  InventoryActions.ReturnFromCustomer,
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
  needSameMaterial: inventoryActionsSpec(action)?.needSameMaterial,
}));

export function haveAdditionalFields(currentAction: InventoryActions) {
  return [
    InventoryActions.CreateTransferInventory,
    InventoryActions.AllocateInventory,
    InventoryActions.ShipInventory,
    InventoryActions.SplitBatch,
    InventoryActions.MergeBatch,
    InventoryActions.ReclassifyInventory,
    InventoryActions.TransferToVendor,
    InventoryActions.ReturnFromVendor,
    InventoryActions.QualityInspection,
    InventoryActions.DeliverToCustomer,
    InventoryActions.ReturnFromCustomer,
  ].includes(currentAction);
}

export function formatAvailableInventoryList({
  inventoryList,
  targetAction,
  inventorySignature,
}: {
  inventoryList: AggregatedStockFragment[];
  targetAction: InventoryActionItem | null;
  inventorySignature: InventorySignature;
}) {
  return inventoryList
    .filter((item) => isEnableActionStatus(item.status, targetAction?.status))
    .map((item) => inventorySignature[item.id])
    .filter((item) => item.quantity > 0);
}
