import {
  ShipInventoryOrderStatus,
  ReceiveInventoryOrderStatus,
} from '../graphql/generated/.graphql';

export const BASE_UNIT = 'BASE_UNIT';

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
