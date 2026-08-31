import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import {
  DataSource,
  DeepPartial,
  EntityManager,
  EntityTarget,
  In,
} from 'typeorm';
import { InventoryCountStatus } from '../constants/inventory-count-status';
import {
  InventoryCountOrderChangeEntityClass,
  InventoryCountOrderEntity,
  InventoryCountOrderEntityClass,
  InventoryCountOrderItemEntityClass,
  InventoryCountOrderLocationEntityClass,
  StockEntityClass,
} from '../models';
import { WmsEntities } from '../models/wms-entities';
import { BatchService } from './batch.service';
import { HelperService } from './helper.service';
import { MaterialService } from './material.service';
import { StockService } from './stock.service';

/** A physical position the count tracks: one row of the count sheet. */
interface StockPosition {
  readonly materialId: string;
  readonly batchId: string;
  readonly locationId: string | null;
  readonly loaderId: string | null;
  readonly quantity: number;
}

export interface FindInventoryCountOrderInput {
  readonly name?: string | null;
  readonly statuses?: readonly InventoryCountStatus[] | null;
  readonly createdBy?: string | null;
  readonly countDateFrom?: string | null;
  readonly countDateTo?: string | null;
  readonly locationIds?: readonly string[] | null;
  readonly offset?: number;
  readonly limit?: number;
}

export interface CreateInventoryCountOrderInput {
  readonly name: string;
  /** The base date the settlement is reported under. `YYYY-MM-DD`. */
  readonly countDate: string;
  /** Root locations; every descendant is pulled into the scope. */
  readonly locationIds: readonly string[];
  readonly createdBy?: string | null;
}

export interface UpdateInventoryCountOrderInput {
  readonly name?: string;
  readonly countDate?: string;
  readonly locationIds?: readonly string[];
}

export interface CountInventoryItemInput {
  readonly itemId: string;
  /** `null` clears the entry — the line goes back to "not counted". */
  readonly countedQuantity: number | null;
  readonly unitId?: string | null;
}

export interface AddInventoryCountItemInput {
  readonly materialId: string;
  /** An existing batch key, or a new one — the batch is created on demand. */
  readonly batchKey: string;
  readonly locationId: string;
  readonly loaderId?: string | null;
  readonly countedQuantity: number;
  readonly unitId?: string | null;
}

/**
 * Inventory counting: compare the ledger against what is physically there, then
 * adjust the ledger to match.
 *
 * The shape follows the "D. 盤點" design flow. Three properties are worth
 * stating up front because everything else follows from them:
 *
 * - **Counting never moves stock between locations.** A line that is in the
 *   wrong place is a transfer, not a count; `transfer-order:create` already does
 *   that. This service only ever adjusts quantity, up or down, in place.
 * - **Nothing touches stock until settlement.** Counted quantities are working
 *   notes ("暫存的對帳資料"); only {@link settle} writes changes, and it does so
 *   in a single transaction.
 * - **Starting a count locks its locations.** The book snapshot taken at
 *   {@link start} would be worthless if stock kept moving underneath it, so
 *   `InventoryCountLockSubscriber` refuses every other stock movement in the
 *   scope until the order settles or is cancelled.
 */
@Injectable()
export class InventoryCountOrderService<
  T extends InventoryCountOrderEntityClass = InventoryCountOrderEntityClass,
> {
  private readonly seqPrefix = 'ICO';

  constructor(
    private readonly dataSource: DataSource,
    private readonly entities: WmsEntities,
    private readonly helperService: HelperService,
    private readonly materialService: MaterialService,
    private readonly stockService: StockService,
    private readonly batchService: BatchService,
    @Inject(InventoryCountOrderEntity)
    readonly inventoryCountOrderEntity: EntityTarget<T>,
  ) {}

  private getRepositories(manager: EntityManager) {
    return {
      order: manager.getRepository<InventoryCountOrderEntityClass>(
        this.inventoryCountOrderEntity,
      ),
      scope: manager.getRepository(InventoryCountOrderLocationEntityClass),
      item: manager.getRepository(InventoryCountOrderItemEntityClass),
      change: manager.getRepository(InventoryCountOrderChangeEntityClass),
      baseOrder: manager.getRepository<OrderEntity>(this.entities.order),
      stock: manager.getRepository<StockEntityClass>(this.entities.stock),
    };
  }

  /**
   * Expand chosen locations into themselves plus every descendant.
   *
   * `LocationEntity` is a plain adjacency list (`parent` / `children`) with no
   * materialised path, so the subtree needs a recursive CTE. It runs once per
   * scope change and the result is stored, precisely so the lock check never has
   * to run it.
   */
  private async expandLocationScope(
    rootIds: readonly string[],
    manager: EntityManager,
  ): Promise<{ id: string; isRoot: boolean }[]> {
    if (!rootIds.length) {
      return [];
    }

    const table = manager.getRepository(this.entities.location).metadata
      .tableName;

    const rows: { id: string }[] = await manager.query(
      `WITH RECURSIVE subtree AS (
         SELECT id FROM "${table}" WHERE id = ANY($1)
         UNION
         SELECT child.id
         FROM "${table}" child
         JOIN subtree parent ON child."parentId" = parent.id
       )
       SELECT id FROM subtree`,
      [[...rootIds]],
    );

    const roots = new Set(rootIds);

    return rows.map(({ id }) => ({ id, isRoot: roots.has(id) }));
  }

  /** Current ledger quantity per physical position inside the scope. */
  private async readPositions(
    locationIds: readonly string[],
    manager: EntityManager,
  ): Promise<StockPosition[]> {
    if (!locationIds.length) {
      return [];
    }

    // Through the repository, not raw SQL on the table: the stock entity is
    // overridable, and the repository is what applies the right
    // single-table-inheritance discriminator.
    const rows = await manager
      .getRepository<StockEntityClass>(this.entities.stock)
      .createQueryBuilder('stock')
      .select('stock.materialId', 'materialId')
      .addSelect('stock.batchId', 'batchId')
      .addSelect('stock.locationId', 'locationId')
      .addSelect('stock.loaderId', 'loaderId')
      .addSelect('SUM(stock.quantity)', 'quantity')
      .where('stock.locationId IN (:...locationIds)', {
        locationIds: [...locationIds],
      })
      .groupBy('stock.materialId')
      .addGroupBy('stock.batchId')
      .addGroupBy('stock.locationId')
      .addGroupBy('stock.loaderId')
      .having('SUM(stock.quantity) > 0')
      .getRawMany<{
        materialId: string;
        batchId: string;
        locationId: string | null;
        loaderId: string | null;
        quantity: string;
      }>();

    return rows.map((row) => ({
      materialId: row.materialId,
      batchId: row.batchId,
      locationId: row.locationId,
      loaderId: row.loaderId,
      quantity: Number(row.quantity),
    }));
  }

  private positionKey(position: {
    materialId: string;
    batchId: string;
    locationId: string | null;
    loaderId: string | null;
  }): string {
    return [
      position.materialId,
      position.batchId,
      position.locationId ?? '',
      position.loaderId ?? '',
    ].join('|');
  }

  private async scopedLocationIds(
    orderId: string,
    manager: EntityManager,
  ): Promise<string[]> {
    const rows = await this.getRepositories(manager).scope.find({
      where: { orderId },
      select: { locationId: true },
    });

    return rows.map(({ locationId }) => locationId);
  }

  private async loadOrderOrFail(
    id: string,
    manager: EntityManager,
  ): Promise<InventoryCountOrderEntityClass> {
    const order = await this.getRepositories(manager).order.findOneBy({ id });

    if (!order) {
      throw new NotFoundException(`Inventory count order ${id} not found`);
    }

    return order;
  }

  private assertStatus(
    order: InventoryCountOrderEntityClass,
    allowed: readonly InventoryCountStatus[],
  ): void {
    if (!allowed.includes(order.status)) {
      throw new BadRequestException(
        `Inventory count order ${order.id} is ${order.status}; this operation requires ${allowed.join(' or ')}`,
      );
    }
  }

  /**
   * Rebuild the sheet from the current ledger.
   *
   * Called when the scope changes and again when counting starts. Additions
   * (盤盈 lines) are never touched — they describe stock the ledger does not know
   * about, so a rebuild has nothing to say about them.
   */
  private async rebuildItems(
    orderId: string,
    manager: EntityManager,
  ): Promise<void> {
    const repos = this.getRepositories(manager);
    const locationIds = await this.scopedLocationIds(orderId, manager);
    const positions = await this.readPositions(locationIds, manager);
    const existing = await repos.item.find({
      where: { orderId, isAddition: false },
    });

    const byKey = new Map(
      existing.map((item) => [this.positionKey(item), item] as const),
    );
    const seen = new Set<string>();

    for (const position of positions) {
      const key = this.positionKey(position);

      seen.add(key);

      const item = byKey.get(key);

      if (item) {
        item.bookQuantity = position.quantity;
        await repos.item.save(item);

        continue;
      }

      await repos.item.save(
        repos.item.create({
          orderId,
          materialId: position.materialId,
          batchId: position.batchId,
          locationId: position.locationId,
          loaderId: position.loaderId,
          bookQuantity: position.quantity,
          countedQuantity: null,
          unitId: null,
          isAddition: false,
        }),
      );
    }

    // A position that emptied out between two rebuilds is no longer on the
    // sheet; it cannot be counted and would settle to a meaningless zero.
    const stale = existing.filter((item) => !seen.has(this.positionKey(item)));

    if (stale.length) {
      await repos.item.delete({ id: In(stale.map(({ id }) => id)) });
    }
  }

  /** Filters for the list page. All optional; combined with AND. */
  async findMany(
    options: FindInventoryCountOrderInput,
    manager = this.dataSource.manager,
  ): Promise<[InventoryCountOrderEntityClass[], number]> {
    const query = this.getRepositories(manager)
      // The alias is lowercase and is deliberately not `order`. `order` is a
      // PostgreSQL reserved word, so the raw fragments below would render
      // `order."countDate"` and fail to parse; and a camelCase alias would be
      // emitted quoted by the query builder while the unquoted references here
      // fold to lowercase, so the two would never match.
      .order.createQueryBuilder('count_order')
      .orderBy('count_order."countDate"', 'DESC')
      .addOrderBy('count_order."createdAt"', 'DESC');

    if (options.name) {
      query.andWhere('count_order.name ILIKE :name', {
        name: `%${options.name}%`,
      });
    }

    if (options.statuses?.length) {
      query.andWhere('count_order.status IN (:...statuses)', {
        statuses: options.statuses,
      });
    }

    if (options.createdBy) {
      query.andWhere('count_order."createdBy" = :createdBy', {
        createdBy: options.createdBy,
      });
    }

    if (options.countDateFrom) {
      query.andWhere('count_order."countDate" >= :from', {
        from: options.countDateFrom,
      });
    }

    if (options.countDateTo) {
      query.andWhere('count_order."countDate" <= :to', {
        to: options.countDateTo,
      });
    }

    if (options.locationIds?.length) {
      // Scope membership, not the roots the user picked: a count of a whole
      // aisle should surface when filtering by any shelf inside it.
      query.andWhere(
        `EXISTS (
           SELECT 1 FROM inventory_count_order_locations scope
            WHERE scope."orderId" = count_order.id
              AND scope."locationId" IN (:...locationIds)
         )`,
        { locationIds: options.locationIds },
      );
    }

    if (options.offset !== undefined && options.offset >= 0) {
      query.skip(options.offset);
    }

    if (options.limit !== undefined && options.limit > 0) {
      query.take(options.limit);
    }

    return query.getManyAndCount();
  }

  async findOne(
    id: string,
    manager = this.dataSource.manager,
  ): Promise<InventoryCountOrderEntityClass> {
    return this.loadOrderOrFail(id, manager);
  }

  async create(
    input: CreateInventoryCountOrderInput,
    manager = this.dataSource.manager,
  ): Promise<T> {
    if (!input.locationIds.length) {
      throw new BadRequestException(
        'An inventory count needs at least one location in scope',
      );
    }

    const repos = this.getRepositories(manager);
    const key = await this.helperService.getSeq(this.seqPrefix, manager);

    const order = await repos.order.save(
      repos.order.create({
        key,
        name: input.name,
        countDate: input.countDate,
        status: InventoryCountStatus.PENDING,
        createdBy: input.createdBy ?? null,
      } as DeepPartial<InventoryCountOrderEntityClass>),
    );

    const scope = await this.expandLocationScope(input.locationIds, manager);

    await repos.scope.save(
      scope.map(({ id, isRoot }) =>
        repos.scope.create({ orderId: order.id, locationId: id, isRoot }),
      ),
    );

    await this.rebuildItems(order.id, manager);

    return order as T;
  }

  async update(
    id: string,
    input: UpdateInventoryCountOrderInput,
    manager = this.dataSource.manager,
  ): Promise<T> {
    const repos = this.getRepositories(manager);
    const order = await this.loadOrderOrFail(id, manager);

    // The design keeps the info panel editable only while nothing has been
    // counted; afterwards the sheet is already anchored to this scope and date.
    this.assertStatus(order, [InventoryCountStatus.PENDING]);

    if (input.name !== undefined) order.name = input.name;
    if (input.countDate !== undefined) order.countDate = input.countDate;

    await repos.order.save(order);

    if (input.locationIds) {
      if (!input.locationIds.length) {
        throw new BadRequestException(
          'An inventory count needs at least one location in scope',
        );
      }

      await repos.scope.delete({ orderId: id });

      const scope = await this.expandLocationScope(input.locationIds, manager);

      await repos.scope.save(
        scope.map(({ id: locationId, isRoot }) =>
          repos.scope.create({ orderId: id, locationId, isRoot }),
        ),
      );

      await this.rebuildItems(id, manager);
    }

    return order as T;
  }

  /**
   * Freeze the ledger and open the sheet for counting.
   *
   * The rebuild here is the snapshot: from this point `bookQuantity` is what the
   * variance is measured against, and the lock keeps it true.
   */
  async start(id: string, manager = this.dataSource.manager): Promise<T> {
    const repos = this.getRepositories(manager);
    const order = await this.loadOrderOrFail(id, manager);

    this.assertStatus(order, [InventoryCountStatus.PENDING]);

    await this.rebuildItems(id, manager);

    order.status = InventoryCountStatus.COUNTING;
    order.startedAt = new Date();

    await repos.order.save(order);

    return order as T;
  }

  /** Save counted quantities without touching stock ("暫存結果"). */
  async count(
    id: string,
    entries: readonly CountInventoryItemInput[],
    manager = this.dataSource.manager,
  ): Promise<T> {
    const repos = this.getRepositories(manager);
    const order = await this.loadOrderOrFail(id, manager);

    this.assertStatus(order, [InventoryCountStatus.COUNTING]);

    if (!entries.length) {
      return order as T;
    }

    const items = await repos.item.find({
      where: { orderId: id, id: In(entries.map(({ itemId }) => itemId)) },
    });
    const byId = new Map(items.map((item) => [item.id, item] as const));

    for (const entry of entries) {
      const item = byId.get(entry.itemId);

      if (!item) {
        throw new NotFoundException(
          `Item ${entry.itemId} does not belong to inventory count order ${id}`,
        );
      }

      if (
        entry.countedQuantity !== null &&
        (!Number.isFinite(entry.countedQuantity) || entry.countedQuantity < 0)
      ) {
        throw new BadRequestException(
          `Counted quantity for item ${entry.itemId} must be a non-negative number`,
        );
      }

      item.countedQuantity = entry.countedQuantity;

      if (entry.unitId !== undefined) {
        item.unitId = entry.unitId;
      }

      await repos.item.save(item);
    }

    return order as T;
  }

  /**
   * Add a line for stock the ledger has no record of (盤盈).
   *
   * The batch is resolved by key and created when it does not exist, which is
   * what makes "the batch field's default is editable" in the design work.
   */
  async addItem(
    id: string,
    input: AddInventoryCountItemInput,
    manager = this.dataSource.manager,
  ): Promise<InventoryCountOrderItemEntityClass> {
    const repos = this.getRepositories(manager);
    const order = await this.loadOrderOrFail(id, manager);

    this.assertStatus(order, [InventoryCountStatus.COUNTING]);

    if (!Number.isFinite(input.countedQuantity) || input.countedQuantity <= 0) {
      throw new BadRequestException(
        'An added inventory count line needs a positive counted quantity',
      );
    }

    const scoped = await this.scopedLocationIds(id, manager);

    // Settlement writes stock at this location, so it has to be one the order
    // locked — otherwise the count would adjust a position other operations are
    // still free to move.
    if (!scoped.includes(input.locationId)) {
      throw new BadRequestException(
        `Location ${input.locationId} is outside the scope of inventory count order ${id}`,
      );
    }

    const batch = await this.batchService.getBatch({
      key: input.batchKey,
      materialId: input.materialId,
      manager,
    });

    return repos.item.save(
      repos.item.create({
        orderId: id,
        materialId: input.materialId,
        batchId: batch.id,
        locationId: input.locationId,
        loaderId: input.loaderId ?? null,
        unitId: input.unitId ?? null,
        bookQuantity: 0,
        countedQuantity: input.countedQuantity,
        isAddition: true,
      }),
    );
  }

  /** Remove an added line. Scoped lines are part of the sheet and never removed. */
  async removeItem(
    id: string,
    itemId: string,
    manager = this.dataSource.manager,
  ): Promise<T> {
    const repos = this.getRepositories(manager);
    const order = await this.loadOrderOrFail(id, manager);

    this.assertStatus(order, [InventoryCountStatus.COUNTING]);

    const item = await repos.item.findOneBy({ id: itemId, orderId: id });

    if (!item) {
      throw new NotFoundException(
        `Item ${itemId} does not belong to inventory count order ${id}`,
      );
    }

    if (!item.isAddition) {
      throw new BadRequestException(
        `Item ${itemId} came from the counted scope and cannot be removed`,
      );
    }

    await repos.item.delete({ id: itemId });

    return order as T;
  }

  /**
   * Throw the counting away and start over, without leaving the count.
   *
   * The scope stays locked and the status stays `COUNTING`: the point is a
   * re-measure after something went wrong on the floor, not an abandonment. The
   * book snapshot is deliberately *not* retaken — the lock means it has not
   * moved.
   */
  async reset(id: string, manager = this.dataSource.manager): Promise<T> {
    const repos = this.getRepositories(manager);
    const order = await this.loadOrderOrFail(id, manager);

    this.assertStatus(order, [InventoryCountStatus.COUNTING]);

    await repos.item.delete({ orderId: id, isAddition: true });
    await repos.item.update(
      { orderId: id },
      { countedQuantity: null, unitId: null },
    );

    return order as T;
  }

  async cancel(id: string, manager = this.dataSource.manager): Promise<T> {
    const repos = this.getRepositories(manager);
    const order = await this.loadOrderOrFail(id, manager);

    this.assertStatus(order, [
      InventoryCountStatus.PENDING,
      InventoryCountStatus.COUNTING,
    ]);

    order.status = InventoryCountStatus.CANCELLED;
    order.cancelledAt = new Date();

    await repos.order.save(order);

    return order as T;
  }

  /**
   * Adjust the ledger to the counted reality ("執行盤差").
   *
   * Runs in one transaction and is awaited end to end, so the mutation
   * interceptor's post-commit guarantee holds: every `stock.count-gained` /
   * `stock.count-lost` event fires only after the adjustments are durable.
   *
   * Uncounted lines are left alone — "not counted" is not "counted as zero", and
   * treating it as zero would wipe out stock nobody looked at.
   */
  async settle(id: string, outerManager?: EntityManager): Promise<T> {
    const run = async (manager: EntityManager): Promise<T> => {
      const repos = this.getRepositories(manager);
      const order = await this.loadOrderOrFail(id, manager);

      this.assertStatus(order, [InventoryCountStatus.COUNTING]);

      const items = await repos.item.find({ where: { orderId: id } });

      for (const item of items) {
        if (item.countedQuantity === null) {
          continue;
        }

        const conversionFactor = await this.materialService.getConversionFactor(
          item.materialId,
          item.unitId ?? undefined,
        );

        const counted = Number(item.countedQuantity) * conversionFactor;
        const delta = counted - Number(item.bookQuantity);

        if (delta === 0) {
          continue;
        }

        const baseOrder = await repos.baseOrder.save({});

        await repos.change.save(
          repos.change.create({
            item,
            order: baseOrder,
            quantityChanged: delta,
          }),
        );

        await repos.stock.save(
          repos.stock.create({
            orderId: baseOrder.id,
            materialId: item.materialId,
            batchId: item.batchId,
            locationId: this.stockService.resolveLocationId(item.locationId),
            loaderId: this.stockService.resolveLoaderId(item.loaderId),
            quantity: delta,
          } as DeepPartial<StockEntityClass>),
        );
      }

      order.status = InventoryCountStatus.COMPLETED;
      order.settledAt = new Date();

      await repos.order.save(order);

      return order as T;
    };

    return outerManager
      ? run(outerManager)
      : this.dataSource.transaction((manager) => run(manager));
  }
}
