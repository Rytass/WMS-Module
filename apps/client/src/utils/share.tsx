import { isNull } from 'lodash';
import { TableColumn, Icon } from '@mezzanine-ui/react';
import { LockIcon, DangerousOutlineIcon } from '@mezzanine-ui/icons';
import {
  StockStatus,
  AggregatedStockFragment,
  ShipInventoryOrderStatus,
  ReceiveInventoryOrderStatus,
  ChangeType,
} from '../graphql/generated/.graphql';
import { WaitIcon, TransferIcon } from '../icons';
import { stockStatusName } from '../components/inventoryActions/utils';

export const BASE_UNIT = 'BASE_UNIT';
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

    default:
      return type;
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

export const aggregatedStockColumns: TableColumn<AggregatedStockFragment>[] = [
  {
    key: 'status',
    title: '狀態',
    width: 100,
    render: (source) => stockStatusName(source.status),
  },
  {
    key: 'inspectionResult',
    title: '檢驗',
    width: 48,
    align: 'center',
    render: (source) =>
      isNull(source.inspectionResult) ? (
        <Icon icon={WaitIcon} color="brand" size={16} />
      ) : !source.inspectionResult ? (
        <Icon icon={DangerousOutlineIcon} color="error" size={16} />
      ) : null,
  },
  {
    key: 'held',
    title: '凍結',
    width: 48,
    align: 'center',
    render: (source) =>
      source.held ? <Icon icon={LockIcon} color="brand" size={16} /> : null,
  },
  {
    key: 'inTransfer',
    title: '調撥',
    width: 48,
    align: 'center',
    render: (source) =>
      source.status === StockStatus.IN_TRANSFER ? (
        <Icon icon={TransferIcon} color="brand" size={16} />
      ) : null,
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
    render: (source) => formatKeyName(source.location?.key),
  },
  {
    key: 'loaderSerialId',
    title: '載具',
    width: 100,
    render: (source) => formatKeyName(source.loader?.serialId),
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
