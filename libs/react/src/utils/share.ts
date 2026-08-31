import {
  ShipInventoryOrderStatus,
  ReceiveInventoryOrderStatus,
  InventoryCountStatus,
  ChangeType,
} from '../graphql/generated/.graphql';

export const BASE_UNIT = 'BASE_UNIT';
export const DEFAULT_MAP_DATA_KEY = 'DEFAULT_MAP_DATA_KEY';
export const DEFAULT_MAP_DATA_NAME = 'ROOT';
export type UnitOptionsType = {
  id: string;
  name: string;
  conversionFactor: number;
}[];

export enum YesOrNo {
  YES = 'YES',
  NO = 'NO',
  NULL = 'NULL',
}

export function yesNoName(option: YesOrNo): string {
  switch (option) {
    case YesOrNo.YES:
      return '是';

    case YesOrNo.NO:
      return '否';

    default:
      return '';
  }
}

export const yesNoOptions = [YesOrNo.YES, YesOrNo.NO].map((o) => ({
  id: o,
  name: yesNoName(o),
}));

export function formatKeyName(key?: string) {
  if (!key || key === 'DEFAULT') {
    return '-';
  }

  return key;
}

export function changeTypeName(type: ChangeType): string {
  switch (type) {
    case ChangeType.RECEIVED:
      return '入庫';

    case ChangeType.SHIPPED:
      return '出庫';

    case ChangeType.MERGED:
      return '併批';

    case ChangeType.SPLITTED:
      return '拆批';

    case ChangeType.HELD:
      return '凍結';

    case ChangeType.RELEASED:
      return '解凍結';

    case ChangeType.VENDOR_RETURNED:
      return '供應商回廠';

    case ChangeType.VENDOR_TRANSFERRED:
      return '調撥至供應商';

    case ChangeType.CUSTOMER_RETURNED:
      return '客戶倉回廠';

    case ChangeType.CUSTOMER_HELD:
      return 'CUSTOMER_HELD';

    case ChangeType.ALLOCATED:
      return '綁定訂單';

    case ChangeType.DEALLOCATED:
      return '解除訂單';

    case ChangeType.RECLASSIFIED:
      return '轉料號';

    case ChangeType.TRANSFERRED:
      return '已調撥';

    case ChangeType.IN_TRANSFER:
      return '調撥';

    case ChangeType.IN_SHIPMENT:
      return '出庫';

    case ChangeType.SCRAPED:
      return '報廢';

    default:
      return type;
  }
}

export function inventoryCountStatusName(status: InventoryCountStatus): string {
  switch (status) {
    case InventoryCountStatus.PENDING:
      return '尚未執行';

    case InventoryCountStatus.COUNTING:
      return '盤點中';

    case InventoryCountStatus.COMPLETED:
      return '已完成';

    case InventoryCountStatus.CANCELLED:
      return '已取消';

    default:
      return '';
  }
}

export function shipInventoryOrderStatusName(
  status?: ShipInventoryOrderStatus,
) {
  switch (status) {
    case ShipInventoryOrderStatus.PENDING:
      return '尚未執行';

    case ShipInventoryOrderStatus.PARTIAL_SHIPPED:
      return '部分出庫';

    case ShipInventoryOrderStatus.SHIPPED:
      return '已出庫';

    case ShipInventoryOrderStatus.REMOVED:
      return '已刪除';

    default:
      return '';
  }
}

export const shipInventoryOrderStatusOptions = [
  ShipInventoryOrderStatus.SHIPPED,
  ShipInventoryOrderStatus.PARTIAL_SHIPPED,
  ShipInventoryOrderStatus.PENDING,
  ShipInventoryOrderStatus.REMOVED,
].map((s) => ({
  id: s,
  name: shipInventoryOrderStatusName(s),
}));

export function receiveInventoryOrderStatusName(
  status?: ReceiveInventoryOrderStatus,
) {
  switch (status) {
    case ReceiveInventoryOrderStatus.PENDING:
      return '尚未執行';

    case ReceiveInventoryOrderStatus.PARTIAL_RECEIVED:
      return '部分入庫';

    case ReceiveInventoryOrderStatus.RECEIVED:
      return '已入庫';

    case ReceiveInventoryOrderStatus.REMOVED:
      return '已刪除';

    default:
      return '';
  }
}

export const receiveInventoryOrderStatusOptions = [
  ReceiveInventoryOrderStatus.RECEIVED,
  ReceiveInventoryOrderStatus.PARTIAL_RECEIVED,
  ReceiveInventoryOrderStatus.PENDING,
  ReceiveInventoryOrderStatus.REMOVED,
].map((s) => ({
  id: s,
  name: receiveInventoryOrderStatusName(s),
}));
