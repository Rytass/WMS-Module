import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  DataSource,
  type EntitySubscriberInterface,
  type InsertEvent,
} from 'typeorm';
import { ChangeType } from '../constants/stock-status';
import { WmsEventCollector } from './wms-event.collector';
import type { WmsStockEventName } from './wms-event.types';

/** A `*_order_change` row as seen in `afterInsert` (relations not loaded). */
interface ChangeRowLike {
  readonly id: string;
  readonly itemId: string;
  readonly quantityChanged: number | string;
  readonly result?: boolean | null;
}

/**
 * Resolve the `ChangeType` for a change table. Tables whose semantics depend on
 * the sign of `quantityChanged` (ship / transfer / vendor / customer / hold /
 * allocate) branch on it; the rest are fixed.
 */
const TABLE_TO_CHANGE_TYPE: ReadonlyMap<
  string,
  (quantity: number) => ChangeType
> = new Map<string, (quantity: number) => ChangeType>([
  ['receive_inventory_order_changes', () => ChangeType.RECEIVED],
  [
    'ship_inventory_order_changes',
    (q: number) => (q > 0 ? ChangeType.IN_SHIPMENT : ChangeType.SHIPPED),
  ],
  [
    'transfer_order_changes',
    (q: number) => (q > 0 ? ChangeType.IN_TRANSFER : ChangeType.TRANSFERRED),
  ],
  [
    'transfer_vendor_order_changes',
    (q: number) =>
      q > 0 ? ChangeType.VENDOR_TRANSFERRED : ChangeType.VENDOR_RETURNED,
  ],
  [
    'transfer_customer_order_changes',
    (q: number) =>
      q > 0 ? ChangeType.CUSTOMER_HELD : ChangeType.CUSTOMER_RETURNED,
  ],
  [
    'hold_inventory_order_changes',
    (q: number) => (q > 0 ? ChangeType.HELD : ChangeType.RELEASED),
  ],
  [
    'allocate_inventory_order_changes',
    (q: number) => (q > 0 ? ChangeType.ALLOCATED : ChangeType.DEALLOCATED),
  ],
  ['split_batch_order_changes', () => ChangeType.SPLITTED],
  ['merge_batch_order_changes', () => ChangeType.MERGED],
  ['reclassify_inventory_order_changes', () => ChangeType.RECLASSIFIED],
  ['scrape_order_changes', () => ChangeType.SCRAPED],
]);

const CHANGE_TYPE_TO_EVENT: Readonly<Record<ChangeType, WmsStockEventName>> = {
  [ChangeType.RECEIVED]: 'stock.received',
  [ChangeType.IN_SHIPMENT]: 'stock.in-shipment',
  [ChangeType.SHIPPED]: 'stock.shipped',
  [ChangeType.IN_TRANSFER]: 'stock.in-transfer',
  [ChangeType.TRANSFERRED]: 'stock.transferred',
  [ChangeType.VENDOR_TRANSFERRED]: 'stock.vendor-transferred',
  [ChangeType.VENDOR_RETURNED]: 'stock.vendor-returned',
  [ChangeType.HELD]: 'stock.held',
  [ChangeType.RELEASED]: 'stock.released',
  [ChangeType.CUSTOMER_HELD]: 'stock.customer-held',
  [ChangeType.CUSTOMER_RETURNED]: 'stock.customer-returned',
  [ChangeType.SPLITTED]: 'stock.splitted',
  [ChangeType.MERGED]: 'stock.merged',
  [ChangeType.ALLOCATED]: 'stock.allocated',
  [ChangeType.DEALLOCATED]: 'stock.deallocated',
  [ChangeType.RECLASSIFIED]: 'stock.reclassified',
  [ChangeType.SCRAPED]: 'stock.scraped',
};

const QUALITY_INSPECTION_TABLE = 'quality_inspection_order_changes';

/**
 * Centralized collection of stock domain events. Listens to every
 * `*_order_change` insert and, using the change table name plus the sign of
 * `quantityChanged`, derives the `ChangeType` and buffers a `stock.*` event
 * into the active dispatch scope (flushed post-commit by the graphql
 * interceptor). This keeps the 12 domain services untouched and automatically
 * covers any future code path that writes a change row.
 *
 * It self-registers on the data source so no global TypeORM `subscribers`
 * config is required.
 */
@Injectable()
export class StockChangeSubscriber implements EntitySubscriberInterface {
  constructor(
    @InjectDataSource() dataSource: DataSource,
    private readonly collector: WmsEventCollector,
  ) {
    dataSource.subscribers.push(this);
  }

  afterInsert(event: InsertEvent<unknown>): void {
    const tableName = event.metadata.tableName;
    const entity = event.entity as ChangeRowLike | undefined;

    if (!entity || typeof entity.id !== 'string') {
      return;
    }

    const quantityDelta = Number(entity.quantityChanged);

    if (tableName === QUALITY_INSPECTION_TABLE) {
      this.collector.collect('stock.inspection-resolved', {
        orderId: entity.id,
        itemId: entity.itemId,
        quantityDelta,
        changeType: null,
        inspectionResult: entity.result ?? null,
      });
      return;
    }

    const resolveChangeType = TABLE_TO_CHANGE_TYPE.get(tableName);

    if (!resolveChangeType) {
      return;
    }

    const changeType = resolveChangeType(quantityDelta);

    this.collector.collect(CHANGE_TYPE_TO_EVENT[changeType], {
      orderId: entity.id,
      itemId: entity.itemId,
      quantityDelta,
      changeType,
    });
  }
}
