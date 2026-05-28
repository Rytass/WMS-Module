import { isNull } from 'lodash';
import { TableColumn, Icon } from '@mezzanine-ui/react';
import { LockIcon, DangerousOutlineIcon } from '@mezzanine-ui/icons';
import {
  StockStatus,
  AggregatedStockFragment,
} from '../graphql/generated/.graphql';
import { WaitIcon, TransferIcon } from '../icons';
import { stockStatusName } from '../components/inventoryActions/utils';
import { formatKeyName } from './share';

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
