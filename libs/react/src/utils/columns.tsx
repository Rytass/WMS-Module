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

/**
 * Host-defined batch attributes as a readable line.
 *
 * Sorted by key so the same batch reads the same way every time — `jsonb` does
 * not preserve insertion order, so without this the columns would reshuffle
 * between rows for no visible reason.
 */
export function formatBatchAttributes(attributes: unknown): string {
  if (
    !attributes ||
    typeof attributes !== 'object' ||
    Array.isArray(attributes)
  )
    return '-';

  const entries = Object.entries(attributes as Record<string, unknown>);

  if (!entries.length) return '-';

  return entries
    .sort(([left], [right]) => left.localeCompare(right))
    .map(
      ([key, value]) =>
        `${key}: ${
          value === null || value === undefined
            ? '-'
            : typeof value === 'object'
              ? JSON.stringify(value)
              : String(value)
        }`,
    )
    .join('、');
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
    /*
     * The waiting icon needs both halves. A null `inspectionResult` on its own
     * is the resting state of every batch nobody ever asked to inspect, so
     * showing the hourglass for it marked the whole warehouse as awaiting QC —
     * the same mistake the `PENDING_INSPECTION` filter used to make.
     */
    render: (source) =>
      source.requiresInspection && isNull(source.inspectionResult) ? (
        <Icon icon={WaitIcon} color="brand" size={16} />
      ) : source.inspectionResult === false ? (
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
  /*
   * Batch lineage and the host's own attributes. Both live on the batch itself
   * rather than the batch group `batchKey` shows, so this row is the only place
   * they surface — following `parentBatchId` upwards is how you get from a
   * child split off by a hold or a shipment back to the batch it came from.
   *
   * `attributes` is whatever the host put there; the module never interprets
   * it, so it is rendered as plain `key: value` pairs rather than given
   * columns of its own.
   */
  {
    key: 'parentBatchId',
    title: '母批',
    width: 140,
    render: (source) => source.parentBatchId || '-',
  },
  {
    key: 'attributes',
    title: '批號屬性',
    width: 200,
    render: (source) => formatBatchAttributes(source.attributes),
  },
];
