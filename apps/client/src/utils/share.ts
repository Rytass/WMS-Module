import { TableColumn } from '@mezzanine-ui/react';
import {
  AggregatedStockFragment,
  ShipInventoryOrderStatus,
  ReceiveInventoryOrderStatus,
} from '../graphql/generated/.graphql';

export const BASE_UNIT = 'BASE_UNIT';

export enum YesOrNo {
  YES = 'YES',
  NO = 'NO',
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

export const aggregatedStockColumns: TableColumn<AggregatedStockFragment>[] = [
  {
    key: 'held',
    title: '檢驗',
    width: 48,
    align: 'center',
    render: (source) => (source.inspectionId ? 'Y' : null),
  },
  {
    key: 'held',
    title: '凍結',
    width: 48,
    align: 'center',
    render: (source) => (source.held ? 'Y' : null),
  },
  {
    key: 'inTransfer',
    title: '調撥',
    width: 48,
    align: 'center',
    render: (source) => (source.inTransfer ? 'Y' : null),
  },
  {
    key: 'materialKey',
    title: '料號',
    width: 140,
    render: (source) => source.material?.key,
  },
  {
    key: 'description',
    title: '物料說明',
    width: 140,
    render: (source) => source.material?.description,
  },
  {
    key: 'batchKey',
    title: '批號',
    width: 140,
    render: (source) => source.batch?.key,
  },
  {
    key: 'locationKey',
    title: '儲存位置',
    width: 140,
    render: (source) => source.location?.key,
  },
  {
    key: 'loaderSerialId',
    title: '載具',
    width: 100,
    render: (source) => source.loader?.serialId,
  },
  {
    key: 'quantity',
    title: '數量',
    width: 100,
    align: 'end',
    render: (source) => source.quantity,
  },
  {
    key: 'baseUnit',
    title: '單位',
    width: 100,
    align: 'center',
    render: (source) => source.material?.baseUnit?.key,
  },
  {
    key: 'vendorId',
    title: '供應商',
    width: 140,
    render: (source) => source.vendorId || '-',
  },
  {
    key: 'customerId',
    title: '客戶',
    width: 140,
    render: (source) => source.customerId || '-',
  },
  {
    key: 'saleId',
    title: '銷售訂單號碼',
    width: 140,
    render: (source) => source.saleId || '-',
  },
  {
    key: 'saleSerialId',
    title: '銷售訂單項次',
    width: 140,
    render: (source) => source.saleSerialId || '-',
  },
];

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
