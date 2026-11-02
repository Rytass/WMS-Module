import { ConflictException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  DataSource,
  type EntitySubscriberInterface,
  type InsertEvent,
} from 'typeorm';
import {
  InventoryCountOrderEntityClass,
  InventoryCountOrderLocationEntityClass,
} from '../models/extensions/inventory-count-order/inventory-count-order.entity';
import { wmsOwnedLogicalTableName } from '../table-prefix/table-prefix';
import { quotedTablePathOf } from '../utils/table-path';

/** The count's own settlement writes here; it must never lock itself out. */
const INVENTORY_COUNT_CHANGE_TABLE = 'inventory_count_order_changes';

/** The columns of an order item that name where its stock sits or goes. */
interface ItemLocationLike {
  readonly id?: string;
  readonly locationId?: string | null;
  /** A transfer item also names a destination; completing it writes stock there. */
  readonly targetLocationId?: string | null;
}

/** A `*_order_change` row as seen in `beforeInsert`. */
interface ChangeRowLike {
  readonly itemId?: string;
  readonly item?: ItemLocationLike;
}

interface LockRow {
  readonly key: string;
  readonly locationId: string;
}

/**
 * Refuse stock movements in locations a running inventory count has locked.
 *
 * Starting a count snapshots the ledger for its scope. That snapshot is what the
 * variance is measured against, so it has to stay true: if a transfer or a
 * shipment moved stock in the meantime, settlement would post the difference
 * between "what we counted" and "what the books said an hour ago" — silently
 * writing off someone else's legitimate movement.
 *
 * Why a subscriber rather than a check in each service
 * ---------------------------------------------------
 * Every stock movement in this package, without exception, ends in a row on some
 * `*_order_change` table — that is the same property `StockChangeSubscriber`
 * relies on to collect `stock.*` events without touching a single service. Doing
 * the lock check at the same choke point means:
 *
 * - the twelve domain services stay untouched;
 * - any future path that writes a change row is covered automatically;
 * - a consumer calling a service **directly**, bypassing the resolvers, is
 *   covered too — which is exactly the case that matters, because a host with
 *   its own inbound flow does precisely that.
 *
 * Both ends of a movement are checked
 * -----------------------------------
 * A transfer item names a source (`locationId`) and a destination
 * (`targetLocationId`), and completing it writes stock at the destination. A
 * change row cannot tell a reservation from a completion — both are an item id
 * and a signed quantity — so any change on an item whose source *or*
 * destination is locked is refused. The cost is that a transfer *into* a counted
 * location cannot be reserved or cancelled either while the count runs. That is
 * the conservative side to err on: stock arriving on a counted shelf is exactly
 * the movement the snapshot cannot absorb.
 *
 * The check costs one indexed lookup per change row. That is deliberate: caching
 * the locked set would open a window right after `start()` in which a movement
 * slips through, and a lock with a window is not a lock.
 */
@Injectable()
export class InventoryCountLockSubscriber implements EntitySubscriberInterface {
  constructor(@InjectDataSource() dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  async beforeInsert(event: InsertEvent<unknown>): Promise<void> {
    // Our tables by class identity and declared name, so the check survives a
    // table prefix. A host's own order family is covered on purpose, by the
    // `_order_changes` suffix of the name it actually has; only our count's
    // own change table -- recognised as ours, not by name -- is exempt.
    const ownedTableName = wmsOwnedLogicalTableName(event.metadata);
    const tableName = ownedTableName ?? event.metadata.tableName;

    if (
      ownedTableName === INVENTORY_COUNT_CHANGE_TABLE ||
      !tableName.endsWith('_order_changes')
    ) {
      return;
    }

    const locationIds = await this.resolveLocationIds(event);

    if (!locationIds.length) {
      // split / merge / reclassify items carry no location. They still move
      // stock, but only within a position the caller already named elsewhere;
      // there is nothing to match against the scope here.
      return;
    }

    const locks: LockRow[] = await event.manager.query(
      `SELECT o."key", l."locationId"
         FROM ${quotedTablePathOf(event.connection, InventoryCountOrderLocationEntityClass)} l
         JOIN ${quotedTablePathOf(event.connection, InventoryCountOrderEntityClass)} o ON o.id = l."orderId"
        WHERE l."locationId" = ANY($1)
          AND o.status = 'COUNTING'
        LIMIT 1`,
      [locationIds],
    );

    if (!locks.length) {
      return;
    }

    // Naming the order is the difference between an operator who can go and
    // settle the count and one who just sees "denied".
    throw new ConflictException(
      `Location ${locks[0].locationId} is locked by inventory count order ${locks[0].key}; finish or cancel that count before moving this stock.`,
    );
  }

  /**
   * Every location the change ultimately touches — the item's own and, for a
   * transfer, the one it is headed to. `beforeInsert` may see the relation
   * either already flattened to `itemId` or still as the item object,
   * depending on how the caller built the row, so both are accepted.
   */
  private async resolveLocationIds(
    event: InsertEvent<unknown>,
  ): Promise<string[]> {
    const item = await this.resolveItem(event);

    if (!item) {
      return [];
    }

    return [
      ...new Set(
        [item.locationId, item.targetLocationId].filter(
          (id): id is string => typeof id === 'string' && id.length > 0,
        ),
      ),
    ];
  }

  private async resolveItem(
    event: InsertEvent<unknown>,
  ): Promise<ItemLocationLike | null> {
    const entity = event.entity as ChangeRowLike | undefined;

    if (!entity) {
      return null;
    }

    if (entity.item && entity.item.locationId !== undefined) {
      return entity.item;
    }

    const itemId = entity.itemId ?? entity.item?.id;

    if (!itemId) {
      return null;
    }

    const itemRelation = event.metadata.relations.find(
      (relation) => relation.propertyName === 'item',
    );

    if (!itemRelation) {
      return null;
    }

    return event.manager
      .getRepository<ItemLocationLike>(
        itemRelation.inverseEntityMetadata.target,
      )
      .findOne({ where: { id: itemId } as never });
  }
}
