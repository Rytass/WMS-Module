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
import { DropdownOption, SelectValue } from '@mezzanine-ui/react';
import {
  StockStatus,
  AggregatedStockFragment,
  MaterialFragment,
} from '../../graphql/generated/.graphql';
import { BASE_UNIT } from '../../utils/share';
import { InventorySignature } from './typing';

export function getQuantityWithUnitId({
  inventory,
  currentUnitId,
}: {
  inventory: AggregatedStockFragment;
  currentUnitId: string | null;
}) {
  if (currentUnitId) {
    const conversionFactor = inventory.material.materialUnits.find(
      (u) => u.id === currentUnitId,
    )?.conversionFactor;

    if (conversionFactor) {
      return Math.round((inventory.quantity / conversionFactor) * 100) / 100;
    }

    return inventory.quantity;
  }

  return inventory.quantity;
}

export function getMaterialUnitOptions(material: MaterialFragment) {
  return [
    {
      id: BASE_UNIT,
      name: material.baseUnit.key,
    },
    ...material.materialUnits.map((u) => ({
      id: u.id,
      name: u.unit,
    })),
  ];
}

export function getUnitName({
  unitId,
  options,
}: {
  unitId: string | null;
  options: SelectValue[];
}) {
  return options.find((o) => o.id === (unitId || BASE_UNIT))?.name ?? '';
}

export function getSaleInformation({
  saleId,
  saleSerialId,
}: {
  saleId?: string | null;
  saleSerialId?: string | null;
}) {
  return saleId ? `${saleId}${saleSerialId ? `-${saleSerialId}` : ''}` : '';
}

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
  condition: (stock: AggregatedStockFragment) => boolean;
  title: string;
  submitText: string;
  needSameMaterial?: boolean;
  maxDataLength?: number;
};

export function inventoryActionsEnableStatus(
  action: InventoryActions,
): (stock: AggregatedStockFragment) => boolean {
  switch (action) {
    case InventoryActions.CreateTransferInventory: // 位置改變
      return (stock: AggregatedStockFragment) =>
        [
          StockStatus.FREE,
          StockStatus.ALLOCATED,
          StockStatus.PENDING_INSPECTION,
          StockStatus.INSPECTION_FAILED,
        ].includes(stock.status);

    case InventoryActions.HoldInventory: // 凍結
      return (stock: AggregatedStockFragment) =>
        stock.status === StockStatus.FREE;

    case InventoryActions.ReleaseInventoryHold: // 解凍
      return (stock: AggregatedStockFragment) =>
        stock.status === StockStatus.HELD;

    case InventoryActions.AllocateInventory: // 銷售訂單標籤
      return (stock: AggregatedStockFragment) =>
        stock.status === StockStatus.FREE;

    case InventoryActions.DeallocateInventory: // 解除銷售訂單標籤
      return (stock: AggregatedStockFragment) =>
        stock.status === StockStatus.FREE && !!stock.saleId;

    case InventoryActions.ShipInventory: // 位置改變
      return (stock: AggregatedStockFragment) =>
        [
          StockStatus.FREE,
          StockStatus.ALLOCATED,
          StockStatus.INSPECTION_FAILED,
          StockStatus.VENDOR_INVENTORY,
          StockStatus.CUSTOMER_INVENTORY,
        ].includes(stock.status);

    case InventoryActions.SplitBatch: // 行為
      return (stock: AggregatedStockFragment) =>
        stock.status === StockStatus.FREE;

    case InventoryActions.MergeBatch: // 行為
      return (stock: AggregatedStockFragment) =>
        stock.status === StockStatus.FREE;

    case InventoryActions.ReclassifyInventory: // 行為
      return (stock: AggregatedStockFragment) =>
        [StockStatus.FREE, StockStatus.INSPECTION_FAILED].includes(
          stock.status,
        );

    case InventoryActions.TransferToVendor: // 位置改變
      return (stock: AggregatedStockFragment) =>
        stock.status === StockStatus.FREE &&
        !stock.vendorId &&
        !stock.customerId;

    case InventoryActions.ReturnFromVendor: // 位置改變
      return (stock: AggregatedStockFragment) =>
        stock.status === StockStatus.VENDOR_INVENTORY ||
        (stock.status === StockStatus.FREE && !!stock.vendorId);

    case InventoryActions.QualityInspection: // 檢驗標籤
      return (stock: AggregatedStockFragment) =>
        [StockStatus.PENDING_INSPECTION].includes(stock.status);

    case InventoryActions.DeliverToCustomer: // 位置改變
      return (stock: AggregatedStockFragment) =>
        stock.status === StockStatus.FREE &&
        !stock.vendorId &&
        !stock.customerId;

    case InventoryActions.ReturnFromCustomer: // 位置改變
      return (stock: AggregatedStockFragment) =>
        stock.status === StockStatus.CUSTOMER_INVENTORY ||
        (stock.status === StockStatus.FREE && !!stock.customerId);

    case InventoryActions.ScrapInventory: // 行為
      return (stock: AggregatedStockFragment) =>
        [StockStatus.FREE, StockStatus.INSPECTION_FAILED].includes(
          stock.status,
        );

    default:
      return () => false;
  }
}

export function inventoryActionsSpec(
  action: InventoryActions,
): InventoryActionItem | null {
  const baseProps = {
    id: action,
    condition: inventoryActionsEnableStatus(action),
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
  InventoryActions.CreateTransferInventory, //要測試
  InventoryActions.HoldInventory,
  InventoryActions.ReleaseInventoryHold,
  InventoryActions.AllocateInventory,
  InventoryActions.DeallocateInventory,
  InventoryActions.ShipInventory, //要測試
  InventoryActions.SplitBatch,
  InventoryActions.MergeBatch,
  InventoryActions.ReclassifyInventory,
  InventoryActions.TransferToVendor,
  InventoryActions.ReturnFromVendor, //要測試
  InventoryActions.QualityInspection, // 還沒接
  InventoryActions.DeliverToCustomer,
  InventoryActions.ReturnFromCustomer, //要測試
  InventoryActions.ScrapInventory,
].map((action) => ({
  id: action,
  name: inventoryActionsSpec(action)?.name ?? '',
  icon: inventoryActionsSpec(action)?.icon,
  validate: inventoryActionsSpec(action)?.validate,
  condition: inventoryActionsSpec(action)?.condition ?? (() => false),
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
    .filter((item) => targetAction?.condition(item))
    .map((item) => inventorySignature[item.id])
    .filter((item) => item.quantity > 0);
}
