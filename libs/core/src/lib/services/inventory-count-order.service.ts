import {
  BadRequestException,
  ConflictException,
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
  LoadersEntityClass,
  MaterialUnitEntityClass,
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
  readonly attributes: BatchAttributes;
}

/**
 * The batch attributes the count sheet displays. They all live on the batch and
 * keep changing after a count settles, so they are snapshotted onto the line.
 */
interface BatchAttributes {
  readonly held: boolean | null;
  readonly inShipment: boolean | null;
  readonly inspectionResult: boolean | null;
  readonly requiresInspection: boolean | null;
  readonly transferId: string | null;
  readonly vendorId: string | null;
  readonly customerId: string | null;
  readonly saleId: string | null;
  readonly saleSerialId: string | null;
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

/**
 * Filters for the count sheet. All optional; combined with AND.
 *
 * The key filters match on the related entity's human-readable key rather than
 * its id, because that is what the operator types and what the sheet shows.
 * The vendor / customer / sale filters read the line's own snapshot columns, so
 * they keep matching what the sheet displays even after the batch has moved on.
 */
export interface FindInventoryCountOrderItemInput {
  readonly materialKey?: string | null;
  readonly materialDescription?: string | null;
  readonly batchKey?: string | null;
  readonly locationKey?: string | null;
  readonly loaderSerialId?: string | null;
  readonly vendorId?: string | null;
  readonly customerId?: string | null;
  readonly saleId?: string | null;
  readonly saleSerialId?: string | null;
  /** Only lines whose counted quantity differs from the books (顯示盤差項目). */
  readonly onlyVariance?: boolean | null;
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

  /**
   * Run `work` inside the caller's transaction when there is one, otherwise
   * open one. Every mutating method goes through here: a count is several rows
   * across three tables, and a failure halfway — a scope row that would not
   * save, a sheet rebuild that threw — must leave nothing behind. It is also
   * what lets the event guarantee hold for a direct service call: the
   * post-commit flush keys off the outermost transaction, and this is it.
   */
  private inTransaction<R>(
    outerManager: EntityManager | undefined,
    work: (manager: EntityManager) => Promise<R>,
  ): Promise<R> {
    return outerManager
      ? work(outerManager)
      : this.dataSource.transaction((manager) => work(manager));
  }

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

    // The batch table is joined by name rather than through its repository
    // because it is only read for its attribute columns — the same thing
    // `StockService.selectQueryBuilder` does. Single-table inheritance means
    // every configured batch entity shares this table, so the join is override
    // safe; the name still comes from the configured entity's metadata rather
    // than being hard-coded.
    const batchTable = manager.getRepository(this.entities.batch).metadata
      .tableName;

    // Through the repository, not raw SQL on the table: the stock entity is
    // overridable, and the repository is what applies the right
    // single-table-inheritance discriminator.
    const rows = await manager
      .getRepository<StockEntityClass>(this.entities.stock)
      .createQueryBuilder('stock')
      .leftJoin(batchTable, 'batch', 'batch.id = stock."batchId"')
      .select('stock.materialId', 'materialId')
      .addSelect('stock.batchId', 'batchId')
      .addSelect('stock.locationId', 'locationId')
      .addSelect('stock.loaderId', 'loaderId')
      .addSelect('SUM(stock.quantity)', 'quantity')
      .addSelect('batch.held', 'held')
      .addSelect('batch."inShipment"', 'inShipment')
      .addSelect('batch."inspectionResult"', 'inspectionResult')
      .addSelect('batch."requiresInspection"', 'requiresInspection')
      .addSelect('batch."transferId"', 'transferId')
      .addSelect('batch."vendorId"', 'vendorId')
      .addSelect('batch."customerId"', 'customerId')
      .addSelect('batch."saleId"', 'saleId')
      .addSelect('batch."saleSerialId"', 'saleSerialId')
      .where('stock.locationId IN (:...locationIds)', {
        locationIds: [...locationIds],
      })
      .groupBy('stock.materialId')
      .addGroupBy('stock.batchId')
      .addGroupBy('stock.locationId')
      .addGroupBy('stock.loaderId')
      // Functionally dependent on batchId, but PostgreSQL only infers that from
      // the grouped table's own primary key, so they have to be listed.
      .addGroupBy('batch.held')
      .addGroupBy('batch."inShipment"')
      .addGroupBy('batch."inspectionResult"')
      .addGroupBy('batch."requiresInspection"')
      .addGroupBy('batch."transferId"')
      .addGroupBy('batch."vendorId"')
      .addGroupBy('batch."customerId"')
      .addGroupBy('batch."saleId"')
      .addGroupBy('batch."saleSerialId"')
      .having('SUM(stock.quantity) > 0')
      .getRawMany<
        {
          materialId: string;
          batchId: string;
          locationId: string | null;
          loaderId: string | null;
          quantity: string;
        } & BatchAttributes
      >();

    return rows.map((row) => ({
      materialId: row.materialId,
      batchId: row.batchId,
      locationId: row.locationId,
      loaderId: row.loaderId,
      quantity: Number(row.quantity),
      attributes: {
        held: row.held ?? null,
        inShipment: row.inShipment ?? null,
        inspectionResult: row.inspectionResult ?? null,
        requiresInspection: row.requiresInspection ?? null,
        transferId: row.transferId ?? null,
        vendorId: row.vendorId ?? null,
        customerId: row.customerId ?? null,
        saleId: row.saleId ?? null,
        saleSerialId: row.saleSerialId ?? null,
      },
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
        Object.assign(item, position.attributes);
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
          ...position.attributes,
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

  /**
   * The count sheet, filtered and paginated.
   *
   * Server-side rather than handing the whole sheet to the client: a count over
   * a whole warehouse is thousands of lines, and the operator's job is to narrow
   * to the shelf in front of them.
   */
  async findItems(
    orderId: string,
    options: FindInventoryCountOrderItemInput = {},
    manager = this.dataSource.manager,
  ): Promise<[InventoryCountOrderItemEntityClass[], number]> {
    const tableOf = (entity: EntityTarget<object>): string =>
      manager.getRepository(entity).metadata.tableName;

    const query = this.getRepositories(manager)
      .item.createQueryBuilder('item')
      .leftJoin(
        tableOf(this.entities.material),
        'material',
        'material.id = item."materialId"',
      )
      .leftJoin(
        tableOf(this.entities.batch),
        'batch',
        'batch.id = item."batchId"',
      )
      .leftJoin(
        tableOf(this.entities.location),
        'location',
        'location.id = item."locationId"',
      )
      .leftJoin(LoadersEntityClass, 'loader', 'loader.id = item."loaderId"')
      .where('item."orderId" = :orderId', { orderId });

    const like = (
      column: string,
      value: string | null | undefined,
      parameter: string,
    ): void => {
      if (!value) return;

      query.andWhere(`${column} ILIKE :${parameter}`, {
        [parameter]: `%${value}%`,
      });
    };

    like('material.key', options.materialKey, 'materialKey');
    like(
      'material.description',
      options.materialDescription,
      'materialDescription',
    );
    like('batch.key', options.batchKey, 'batchKey');
    like('location.key', options.locationKey, 'locationKey');
    like('loader."serialId"', options.loaderSerialId, 'loaderSerialId');

    const exact = (
      column: string,
      value: string | null | undefined,
      parameter: string,
    ): void => {
      if (!value) return;

      query.andWhere(`${column} = :${parameter}`, { [parameter]: value });
    };

    exact('item."vendorId"', options.vendorId, 'vendorId');
    exact('item."customerId"', options.customerId, 'customerId');
    exact('item."saleId"', options.saleId, 'saleId');
    exact('item."saleSerialId"', options.saleSerialId, 'saleSerialId');

    if (options.onlyVariance) {
      // The counted quantity is expressed in the line's unit, so it has to be
      // converted before it can be compared with the base-unit book quantity —
      // the same conversion settlement applies.
      query
        .leftJoin(MaterialUnitEntityClass, 'unit', 'unit.id = item."unitId"')
        .andWhere('item."countedQuantity" IS NOT NULL')
        .andWhere(
          'item."countedQuantity" * COALESCE(unit."conversionFactor", 1) <> item."bookQuantity"',
        );
    }

    // Counted before ordering and paginating: `getCount()` rewrites the query
    // into a COUNT, and an ORDER BY on a joined column it does not select makes
    // that rewrite fail.
    const total = await query.getCount();

    // Additions first — they are what the operator just typed — then a stable
    // order so paging cannot repeat or skip a line.
    query
      .orderBy('item."isAddition"', 'DESC')
      .addOrderBy('material.key', 'ASC')
      .addOrderBy('batch.key', 'ASC')
      .addOrderBy('item.id', 'ASC');

    // `limit`/`offset` rather than `take`/`skip`: the latter wraps the query in a
    // DISTINCT subquery to survive one-to-many joins, and then cannot map an
    // ORDER BY on a joined column into it. Every join here is many-to-one, so no
    // row multiplication and no need for that machinery.
    if (options.offset !== undefined && options.offset >= 0) {
      query.offset(options.offset);
    }

    if (options.limit !== undefined && options.limit > 0) {
      query.limit(options.limit);
    }

    return [await query.getMany(), total];
  }

  async create(
    input: CreateInventoryCountOrderInput,
    outerManager?: EntityManager,
  ): Promise<T> {
    if (!input.locationIds.length) {
      throw new BadRequestException(
        'An inventory count needs at least one location in scope',
      );
    }

    return this.inTransaction(outerManager, async (manager) => {
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
    });
  }

  async update(
    id: string,
    input: UpdateInventoryCountOrderInput,
    outerManager?: EntityManager,
  ): Promise<T> {
    if (input.locationIds && !input.locationIds.length) {
      throw new BadRequestException(
        'An inventory count needs at least one location in scope',
      );
    }

    return this.inTransaction(outerManager, async (manager) => {
      const repos = this.getRepositories(manager);
      const order = await this.loadOrderOrFail(id, manager);

      // The design keeps the info panel editable only while nothing has been
      // counted; afterwards the sheet is already anchored to this scope and
      // date.
      this.assertStatus(order, [InventoryCountStatus.PENDING]);

      if (input.name !== undefined) order.name = input.name;
      if (input.countDate !== undefined) order.countDate = input.countDate;

      await repos.order.save(order);

      if (input.locationIds) {
        await repos.scope.delete({ orderId: id });

        const scope = await this.expandLocationScope(
          input.locationIds,
          manager,
        );

        await repos.scope.save(
          scope.map(({ id: locationId, isRoot }) =>
            repos.scope.create({ orderId: id, locationId, isRoot }),
          ),
        );

        await this.rebuildItems(id, manager);
      }

      return order as T;
    });
  }

  /**
   * Freeze the ledger and open the sheet for counting.
   *
   * The rebuild here is the snapshot: from this point `bookQuantity` is what the
   * variance is measured against, and the lock keeps it true. Snapshot and
   * status flip commit together, so there is never a moment with the lock on
   * and stale books behind it, or fresh books and no lock.
   */
  async start(id: string, outerManager?: EntityManager): Promise<T> {
    return this.inTransaction(outerManager, async (manager) => {
      const repos = this.getRepositories(manager);
      const order = await this.loadOrderOrFail(id, manager);

      this.assertStatus(order, [InventoryCountStatus.PENDING]);

      await this.rebuildItems(id, manager);

      order.status = InventoryCountStatus.COUNTING;
      order.startedAt = new Date();

      await repos.order.save(order);

      return order as T;
    });
  }

  /** Save counted quantities without touching stock ("暫存結果"). */
  async count(
    id: string,
    entries: readonly CountInventoryItemInput[],
    outerManager?: EntityManager,
  ): Promise<T> {
    return this.inTransaction(outerManager, async (manager) => {
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
    });
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
    outerManager?: EntityManager,
  ): Promise<InventoryCountOrderItemEntityClass> {
    if (!Number.isFinite(input.countedQuantity) || input.countedQuantity <= 0) {
      throw new BadRequestException(
        'An added inventory count line needs a positive counted quantity',
      );
    }

    return this.inTransaction(outerManager, async (manager) => {
      const repos = this.getRepositories(manager);
      const order = await this.loadOrderOrFail(id, manager);

      this.assertStatus(order, [InventoryCountStatus.COUNTING]);

      const scoped = await this.scopedLocationIds(id, manager);

      // Settlement writes stock at this location, so it has to be one the
      // order locked — otherwise the count would adjust a position other
      // operations are still free to move.
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

      // One line per position. Settlement resolves a missing loader to the
      // default one, so the comparison is on the resolved position: a line
      // the sheet already carries for this shelf must be counted *on that
      // line*, or settlement would adjust the same stock twice.
      const resolvedLoaderId = this.stockService.resolveLoaderId(
        input.loaderId,
      );
      const duplicate = (
        await repos.item.find({
          where: {
            orderId: id,
            materialId: input.materialId,
            batchId: batch.id,
            locationId: input.locationId,
          },
        })
      ).find(
        (line) =>
          this.stockService.resolveLoaderId(line.loaderId) === resolvedLoaderId,
      );

      if (duplicate) {
        throw new BadRequestException(
          `Inventory count order ${id} already has a line for this position (item ${duplicate.id}); count it there instead of adding another`,
        );
      }

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
          // Snapshotted from the batch the same way a scoped line is, so an
          // added line renders through the identical columns. A brand-new
          // batch carries the defaults, which is exactly right: unbooked stock
          // is not held, not in transfer and not inspected.
          held: batch.held ?? null,
          inShipment: batch.inShipment ?? null,
          inspectionResult: batch.inspectionResult ?? null,
          requiresInspection: batch.requiresInspection ?? null,
          transferId: batch.transferId ?? null,
          vendorId: batch.vendorId ?? null,
          customerId: batch.customerId ?? null,
          saleId: batch.saleId ?? null,
          saleSerialId: batch.saleSerialId ?? null,
        }),
      );
    });
  }

  /** Remove an added line. Scoped lines are part of the sheet and never removed. */
  async removeItem(
    id: string,
    itemId: string,
    outerManager?: EntityManager,
  ): Promise<T> {
    return this.inTransaction(outerManager, async (manager) => {
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
    });
  }

  /**
   * Throw the counting away and start over, without leaving the count.
   *
   * The scope stays locked and the status stays `COUNTING`: the point is a
   * re-measure after something went wrong on the floor, not an abandonment. The
   * book snapshot is deliberately *not* retaken — the lock means it has not
   * moved.
   */
  async reset(id: string, outerManager?: EntityManager): Promise<T> {
    return this.inTransaction(outerManager, async (manager) => {
      const repos = this.getRepositories(manager);
      const order = await this.loadOrderOrFail(id, manager);

      this.assertStatus(order, [InventoryCountStatus.COUNTING]);

      await repos.item.delete({ orderId: id, isAddition: true });
      await repos.item.update(
        { orderId: id },
        { countedQuantity: null, unitId: null },
      );

      return order as T;
    });
  }

  async cancel(id: string, outerManager?: EntityManager): Promise<T> {
    return this.inTransaction(outerManager, async (manager) => {
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
    });
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
   *
   * Before anything is written, the snapshot is checked against the live
   * ledger. The lock makes the two equal by construction; if they differ,
   * something wrote around the lock — a direct `stocks` insert, a path with no
   * change row — and settling would post a variance against books that no
   * longer exist. Refusing is the only safe answer.
   */
  async settle(id: string, outerManager?: EntityManager): Promise<T> {
    return this.inTransaction(outerManager, async (manager) => {
      const repos = this.getRepositories(manager);
      const order = await this.loadOrderOrFail(id, manager);

      this.assertStatus(order, [InventoryCountStatus.COUNTING]);

      const items = await repos.item.find({ where: { orderId: id } });

      await this.assertSnapshotHolds(order, items, manager);

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
    });
  }

  /** Every scoped line's `bookQuantity` must still equal the ledger. */
  private async assertSnapshotHolds(
    order: InventoryCountOrderEntityClass,
    items: readonly InventoryCountOrderItemEntityClass[],
    manager: EntityManager,
  ): Promise<void> {
    const scoped = await this.scopedLocationIds(order.id, manager);
    const live = new Map(
      (await this.readPositions(scoped, manager)).map(
        (position) => [this.positionKey(position), position.quantity] as const,
      ),
    );

    for (const item of items) {
      if (item.isAddition) {
        continue;
      }

      const current = live.get(this.positionKey(item)) ?? 0;

      if (current !== Number(item.bookQuantity)) {
        throw new ConflictException(
          `Inventory count order ${order.key} cannot settle: the ledger behind item ${item.id} moved from ${item.bookQuantity} to ${current} while the count was running. Cancel the count and recount this scope.`,
        );
      }
    }
  }
}
