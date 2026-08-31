import { ConflictException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  DataSource,
  type EntitySubscriberInterface,
  type InsertEvent,
} from 'typeorm';

/** The count's own settlement writes here; it must never lock itself out. */
const INVENTORY_COUNT_CHANGE_TABLE = 'inventory_count_order_changes';

/** A `*_order_change` row as seen in `beforeInsert`. */
interface ChangeRowLike {
  readonly itemId?: string;
  readonly item?: { readonly id?: string; readonly locationId?: string | null };
}

interface LockRow {
  readonly key: string;
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
    const tableName = event.metadata.tableName;

    if (
      tableName === INVENTORY_COUNT_CHANGE_TABLE ||
      !tableName.endsWith('_order_changes')
    ) {
      return;
    }

    const locationId = await this.resolveLocationId(event);

    if (!locationId) {
      // split / merge / reclassify items carry no location. They still move
      // stock, but only within a position the caller already named elsewhere;
      // there is nothing to match against the scope here.
      return;
    }

    const locks: LockRow[] = await event.manager.query(
      `SELECT o."key"
         FROM inventory_count_order_locations l
         JOIN inventory_count_orders o ON o.id = l."orderId"
        WHERE l."locationId" = $1
          AND o.status = 'COUNTING'
        LIMIT 1`,
      [locationId],
    );

    if (!locks.length) {
      return;
    }

    // Naming the order is the difference between an operator who can go and
    // settle the count and one who just sees "denied".
    throw new ConflictException(
      `Location ${locationId} is locked by inventory count order ${locks[0].key}; finish or cancel that count before moving this stock.`,
    );
  }

  /**
   * The location the change ultimately touches, taken from the change's order
   * item. `beforeInsert` may see the relation either already flattened to
   * `itemId` or still as the item object, depending on how the caller built the
   * row, so both are accepted.
   */
  private async resolveLocationId(
    event: InsertEvent<unknown>,
  ): Promise<string | null> {
    const entity = event.entity as ChangeRowLike | undefined;

    if (!entity) {
      return null;
    }

    if (entity.item && entity.item.locationId !== undefined) {
      return entity.item.locationId;
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

    const item = await event.manager
      .getRepository<{
        locationId?: string | null;
      }>(itemRelation.inverseEntityMetadata.target)
      .findOne({ where: { id: itemId } as never });

    return item?.locationId ?? null;
  }
}
