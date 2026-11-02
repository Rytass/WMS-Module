import { Inject, Injectable, Optional } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  DataSource,
  type EntitySubscriberInterface,
  type InsertEvent,
} from 'typeorm';
import { ConsumptionChangeKind } from '../constants/consumption-change-kind';
import { ChangeType } from '../constants/stock-status';
import type {
  WmsCustomChangeTable,
  WmsStockChangeRow,
} from '../typings/custom-change-table';
import { WmsEventCollector } from './wms-event.collector';
import { wmsLogicalTableName } from '../table-prefix/logical-table-name';
import { WMS_CUSTOM_CHANGE_TABLES, WMS_STOCK_ENRICH } from './wms-event.tokens';
import type { WmsStockEventPayload } from './wms-event.types';
import type { WmsStockEventName } from './wms-event.types';

/** A `*_order_change` row as seen in `afterInsert` (relations not loaded). */
interface ChangeRowLike {
  readonly id: string;
  readonly itemId: string;
  readonly quantityChanged: number | string;
  readonly result?: boolean | null;
  /** Consumption orders record intent rather than encoding it in the sign. */
  readonly kind?: ConsumptionChangeKind | null;
}

/** The subset of order-item columns used to enrich a stock event. */
interface OrderItemFieldsLike {
  readonly id: string;
  readonly materialId?: string | null;
  readonly batchId?: string | null;
  readonly locationId?: string | null;
  readonly loaderId?: string | null;
}

/** The optional id fields appended to a stock payload when enrichment is on. */
type StockEnrichment = Pick<
  WmsStockEventPayload,
  'materialId' | 'batchId' | 'locationId' | 'loaderId'
>;

/**
 * The consumption order's three actions, which the sign cannot separate: a
 * return and a settlement are both negative.
 */
const CONSUMPTION_KIND_TO_CHANGE_TYPE: Readonly<
  Record<ConsumptionChangeKind, ChangeType>
> = {
  [ConsumptionChangeKind.ISSUE]: ChangeType.ISSUED,
  [ConsumptionChangeKind.RETURN]: ChangeType.RETURNED,
  [ConsumptionChangeKind.SETTLE]: ChangeType.CONSUMED,
};

/**
 * Resolve the `ChangeType` for a change table. Most tables whose semantics
 * depend on direction (ship / transfer / vendor / customer / hold / allocate)
 * branch on the sign of `quantityChanged`; the rest are fixed. The resolver is
 * handed the whole row rather than just the quantity because the sign is not
 * always enough — see `consumption_order_changes`.
 */
const TABLE_TO_CHANGE_TYPE: ReadonlyMap<
  string,
  (change: ChangeRowLike) => ChangeType | null
> = new Map<string, (change: ChangeRowLike) => ChangeType | null>([
  ['receive_inventory_order_changes', () => ChangeType.RECEIVED],
  [
    'ship_inventory_order_changes',
    ({ quantityChanged: q }) =>
      Number(q) > 0 ? ChangeType.IN_SHIPMENT : ChangeType.SHIPPED,
  ],
  [
    'transfer_order_changes',
    ({ quantityChanged: q }) =>
      Number(q) > 0 ? ChangeType.IN_TRANSFER : ChangeType.TRANSFERRED,
  ],
  [
    'transfer_vendor_order_changes',
    ({ quantityChanged: q }) =>
      Number(q) > 0
        ? ChangeType.VENDOR_TRANSFERRED
        : ChangeType.VENDOR_RETURNED,
  ],
  [
    'transfer_customer_order_changes',
    ({ quantityChanged: q }) =>
      Number(q) > 0 ? ChangeType.CUSTOMER_HELD : ChangeType.CUSTOMER_RETURNED,
  ],
  [
    'hold_inventory_order_changes',
    ({ quantityChanged: q }) =>
      Number(q) > 0 ? ChangeType.HELD : ChangeType.RELEASED,
  ],
  [
    'allocate_inventory_order_changes',
    ({ quantityChanged: q }) =>
      Number(q) > 0 ? ChangeType.ALLOCATED : ChangeType.DEALLOCATED,
  ],
  ['split_batch_order_changes', () => ChangeType.SPLITTED],
  ['merge_batch_order_changes', () => ChangeType.MERGED],
  ['reclassify_inventory_order_changes', () => ChangeType.RECLASSIFIED],
  ['scrape_order_changes', () => ChangeType.SCRAPED],
  [
    'inventory_count_order_changes',
    ({ quantityChanged: q }) =>
      Number(q) > 0 ? ChangeType.COUNT_GAINED : ChangeType.COUNT_LOST,
  ],
  [
    'consumption_order_changes',
    ({ kind }) => (kind ? CONSUMPTION_KIND_TO_CHANGE_TYPE[kind] : null),
  ],
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
  [ChangeType.COUNT_GAINED]: 'stock.count-gained',
  [ChangeType.COUNT_LOST]: 'stock.count-lost',
  [ChangeType.ISSUED]: 'stock.issued',
  [ChangeType.RETURNED]: 'stock.returned',
  [ChangeType.CONSUMED]: 'stock.consumed',
};

const QUALITY_INSPECTION_TABLE = 'quality_inspection_order_changes';

/**
 * Every change table this package owns, derived from the map above rather than
 * restated.
 *
 * `WmsModuleCoreModule` refuses to let a host register one of these, and the
 * subscriber consults host registrations *before* the built-in map — so a table
 * added to the map but forgotten in a hand-maintained copy of this list would
 * become host-registrable, letting a host's resolver silently reclassify every
 * row on it. Deriving it is the difference between a rule and a rule someone has
 * to remember.
 */
export const OWNED_CHANGE_TABLES: ReadonlySet<string> = new Set([
  ...TABLE_TO_CHANGE_TYPE.keys(),
  QUALITY_INSPECTION_TABLE,
]);

/** Every `ChangeType` value, for deciding whether a host reused our vocabulary. */
const CHANGE_TYPE_VALUES: ReadonlySet<string> = new Set(
  Object.values(ChangeType),
);

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
  /** Host-registered tables, keyed by table name. Empty unless configured. */
  private readonly customTables: ReadonlyMap<string, WmsCustomChangeTable>;

  constructor(
    @InjectDataSource() dataSource: DataSource,
    private readonly collector: WmsEventCollector,
    @Optional()
    @Inject(WMS_STOCK_ENRICH)
    private readonly enrich = false,
    @Optional()
    @Inject(WMS_CUSTOM_CHANGE_TABLES)
    customTables: readonly WmsCustomChangeTable[] | null = null,
  ) {
    this.customTables = new Map(
      (customTables ?? []).map((entry) => [entry.table, entry]),
    );

    dataSource.subscribers.push(this);
  }

  async afterInsert(event: InsertEvent<unknown>): Promise<void> {
    // Our own tables are matched by the name they were declared with, so a
    // `withWmsTablePrefix` deployment classifies `wms_transfer_order_changes`
    // exactly as `transfer_order_changes`. A host's custom table is matched by
    // the name it actually has: we never prefix it.
    const actualTableName = event.metadata.tableName;
    const tableName = wmsLogicalTableName(actualTableName);
    const entity = event.entity as ChangeRowLike | undefined;

    if (!entity || typeof entity.id !== 'string') {
      return;
    }

    const quantityDelta = Number(entity.quantityChanged);

    if (tableName === QUALITY_INSPECTION_TABLE) {
      const enrichment = this.enrich
        ? await this.loadItemFields(event, entity.itemId)
        : undefined;

      this.collector.collect('stock.inspection-resolved', {
        orderId: entity.id,
        itemId: entity.itemId,
        quantityDelta,
        changeType: null,
        inspectionResult: entity.result ?? null,
        ...enrichment,
      });
      return;
    }

    const custom = OWNED_CHANGE_TABLES.has(tableName)
      ? undefined
      : this.customTables.get(actualTableName);

    if (custom) {
      await this.collectCustom(event, entity, quantityDelta, custom);
      return;
    }

    const resolveChangeType = TABLE_TO_CHANGE_TYPE.get(tableName);

    if (!resolveChangeType) {
      // Not a stock change table — enrich nothing, emit nothing.
      return;
    }

    const changeType = resolveChangeType(entity);

    if (!changeType) {
      // A row the table's resolver could not classify. Emitting a wrong event
      // would be worse than emitting none.
      return;
    }

    const enrichment = this.enrich
      ? await this.loadItemFields(event, entity.itemId)
      : undefined;

    this.collector.collect(CHANGE_TYPE_TO_EVENT[changeType], {
      orderId: entity.id,
      itemId: entity.itemId,
      quantityDelta,
      changeType,
      ...enrichment,
    });
  }

  /**
   * Emit for a table the host registered.
   *
   * A resolver that names one of our own `ChangeType`s gets that type's event,
   * so a movement the host models itself but which really is a receipt or a
   * scrap still counts in reports as one. Anything else becomes `stock.custom`
   * carrying the host's string, because inventing an event name per host would
   * break every exhaustive listener in the package.
   */
  private async collectCustom(
    event: InsertEvent<unknown>,
    entity: ChangeRowLike,
    quantityDelta: number,
    custom: WmsCustomChangeTable,
  ): Promise<void> {
    const resolved = custom.changeType(entity as unknown as WmsStockChangeRow);

    if (!resolved) {
      // The host says this row does not move stock. Nothing to say about it.
      return;
    }

    const enrichment = this.enrich
      ? await this.loadItemFields(event, entity.itemId)
      : undefined;

    const known = CHANGE_TYPE_VALUES.has(resolved)
      ? (resolved as ChangeType)
      : null;

    this.collector.collect(
      known ? CHANGE_TYPE_TO_EVENT[known] : 'stock.custom',
      {
        orderId: entity.id,
        itemId: entity.itemId,
        quantityDelta,
        changeType: known,
        ...(known ? {} : { customChangeType: resolved }),
        ...enrichment,
      },
    );
  }

  /**
   * Load `materialId / batchId / locationId / loaderId` from the change's order
   * item (one PK lookup, same transaction). Generic across all 12 change tables
   * via the `item` relation metadata. Returns `undefined` on any miss so the
   * event still fires with the lazy payload. split/merge/reclassify items carry
   * no material/batch — those stay null.
   */
  private async loadItemFields(
    event: InsertEvent<unknown>,
    itemId: string,
  ): Promise<StockEnrichment | undefined> {
    try {
      const itemRelation = event.metadata.relations.find(
        (relation) => relation.propertyName === 'item',
      );

      if (!itemRelation) {
        return undefined;
      }

      const item = await event.manager
        .getRepository<OrderItemFieldsLike>(
          itemRelation.inverseEntityMetadata.target,
        )
        .findOne({ where: { id: itemId } });

      if (!item) {
        return undefined;
      }

      return {
        materialId: item.materialId ?? null,
        batchId: item.batchId ?? null,
        locationId: item.locationId ?? null,
        loaderId: item.loaderId ?? null,
      };
    } catch {
      // Enrichment is best-effort; never break the mutation over it.
      return undefined;
    }
  }
}
