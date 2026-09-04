import { Inject, Injectable } from '@nestjs/common';
import {
  DataSource,
  DeepPartial,
  EntityManager,
  EntityTarget,
  In,
  IsNull,
  Repository,
} from 'typeorm';
import {
  ConsumptionOrderChangeEntityClass,
  ConsumptionOrderEntity,
  ConsumptionOrderEntityClass,
  ConsumptionOrderItemEntity,
  ConsumptionOrderItemEntityClass,
  StockEntity,
  StockEntityClass,
} from '../models';
import { ConsumptionChangeKind } from '../constants/consumption-change-kind';
import {
  ConsumptionOrderActionInput,
  ConsumptionOrderItemProgress,
  CreateConsumptionOrderInput,
  CreateConsumptionOrderItemInput,
  FindConsumptionOrderInput,
  UpdateConsumptionOrderInput,
} from '../typings/consumption-order.input';
import { WmsEntities } from '../models/wms-entities';
import { HelperService } from './helper.service';
import { MaterialService } from './material.service';
import { StockService } from './stock.service';

/** The quantities a single change row moves, in base units. */
interface Movement {
  readonly from: { locationId: string; loaderId: string };
  readonly to: { locationId: string; loaderId: string } | null;
}

/**
 * Material handed to a process that consumes it: issue it out, take back what
 * came home, settle what was used.
 *
 * The three actions share one order because they are one story, and because
 * that is the grammar the rest of this package already speaks — hold/release,
 * allocate/deallocate and transfer/cancel are each a single order too.
 *
 * No new stock status. An issue is a location move and nothing else: status
 * here is a flag on the *batch*, so a "being consumed" status would force every
 * partial issue to split a child batch off it, and one batch key per issue is a
 * worse answer than one location. What the process actually is — a work order,
 * a repair job, a subcontract — belongs in `order_references`, which can say
 * *which* one; a status could only ever say "some".
 */
@Injectable()
export class ConsumptionOrderService<
  T extends ConsumptionOrderEntityClass = ConsumptionOrderEntityClass,
  K extends ConsumptionOrderItemEntityClass = ConsumptionOrderItemEntityClass,
> {
  private readonly seqPrefix = 'CSO';
  readonly consumptionOrderRepository: Repository<T>;

  constructor(
    private readonly dataSource: DataSource,
    private readonly entities: WmsEntities,
    private readonly helperService: HelperService,
    private readonly materialService: MaterialService,
    private readonly stockService: StockService,
    @Inject(ConsumptionOrderEntity)
    readonly consumptionOrderEntity: EntityTarget<T>,
    @Inject(ConsumptionOrderItemEntity)
    readonly consumptionOrderItemEntity: EntityTarget<K>,
    @Inject(StockEntity)
    readonly stockEntity: EntityTarget<StockEntityClass>,
  ) {
    this.consumptionOrderRepository = this.dataSource.getRepository(
      this.consumptionOrderEntity,
    );
  }

  private getRepositories(manager: EntityManager) {
    return {
      consumptionOrder: manager.getRepository<ConsumptionOrderEntityClass>(
        this.consumptionOrderEntity,
      ),
      consumptionOrderItem:
        manager.getRepository<ConsumptionOrderItemEntityClass>(
          this.consumptionOrderItemEntity,
        ),
      consumptionOrderChange: manager.getRepository(
        ConsumptionOrderChangeEntityClass,
      ),
      order: manager.getRepository(this.entities.order),
      stock: manager.getRepository<StockEntityClass>(this.stockEntity),
    };
  }

  private itemRow(
    input: CreateConsumptionOrderItemInput,
    orderId: string,
  ): DeepPartial<ConsumptionOrderItemEntityClass> {
    const locationId = this.stockService.resolveLocationId(input.locationId);

    return {
      orderId,
      materialId: input.materialId,
      batchId: input.batchId,
      locationId,
      loaderId: this.stockService.resolveLoaderId(input.loaderId),
      unitId: input.unitId ?? null,
      targetConsumedQuantity: input.quantity,
      // Defaulting the destination to the source keeps a host that does not
      // separate a consuming location from the shelf working: the stock rows
      // net out and only the change rows record what happened.
      targetLocationId: this.stockService.resolveLocationId(
        input.targetLocationId ?? locationId,
      ),
      targetLoaderId: this.stockService.resolveLoaderId(
        input.targetLoaderId ?? input.loaderId,
      ),
    };
  }

  async createConsumptionOrder(
    options: CreateConsumptionOrderInput,
  ): Promise<T> {
    if (!options.items.length) {
      throw new Error('A consumption order needs at least one item');
    }

    return this.dataSource.transaction(async (manager) => {
      const repos = this.getRepositories(manager);
      const key = await this.helperService.getSeq(this.seqPrefix, manager);

      const order = await repos.consumptionOrder.save(
        repos.consumptionOrder.create({
          key,
          description: options.description ?? null,
          createdBy: options.createdBy ?? null,
        } as DeepPartial<ConsumptionOrderEntityClass>),
      );

      await repos.consumptionOrderItem.save(
        options.items.map((item) =>
          repos.consumptionOrderItem.create(this.itemRow(item, order.id)),
        ),
      );

      return order as T;
    });
  }

  /**
   * Replace the order's lines. Refused once anything has moved: the changes
   * point at items, so swapping the items out from under them would leave the
   * ledger describing lines that no longer exist.
   */
  async updateConsumptionOrder(
    options: UpdateConsumptionOrderInput,
  ): Promise<T> {
    return this.dataSource.transaction(async (manager) => {
      const repos = this.getRepositories(manager);

      const order = await repos.consumptionOrder.findOneOrFail({
        where: { id: options.id },
      });

      if (options.description !== undefined) {
        await repos.consumptionOrder.update(order.id, {
          description: options.description,
        });
      }

      if (options.items) {
        const existing = await repos.consumptionOrderItem.find({
          where: { orderId: order.id, removedAt: IsNull() },
        });

        const moved = existing.length
          ? await repos.consumptionOrderChange.count({
              where: { itemId: In(existing.map(({ id }) => id)) },
            })
          : 0;

        if (moved > 0) {
          throw new Error(
            `Consumption order ${order.key} has already moved stock; its items can no longer be replaced`,
          );
        }

        await repos.consumptionOrderItem.remove(existing);
        await repos.consumptionOrderItem.save(
          options.items.map((item) =>
            repos.consumptionOrderItem.create(this.itemRow(item, order.id)),
          ),
        );
      }

      return repos.consumptionOrder.findOneOrFail({
        where: { id: order.id },
      }) as Promise<T>;
    });
  }

  async removeConsumptionOrder(id: string): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      const repos = this.getRepositories(manager);
      const items = await repos.consumptionOrderItem.find({
        where: { orderId: id, removedAt: IsNull() },
      });

      const moved = items.length
        ? await repos.consumptionOrderChange.count({
            where: { itemId: In(items.map(({ id: itemId }) => itemId)) },
          })
        : 0;

      if (moved > 0) {
        throw new Error(
          `Consumption order ${id} has already moved stock and cannot be removed`,
        );
      }

      const removedAt = new Date();

      await repos.consumptionOrderItem.update({ orderId: id }, {
        removedAt,
      } as never);
      await repos.consumptionOrder.update(id, { removedAt } as never);

      return true;
    });
  }

  /**
   * How much of each line has moved. The changes are the only record of that —
   * nothing is denormalised onto the item — so `issue`, `return` and `settle`
   * all read it back before they write.
   */
  async getProgress(
    orderId: string,
    manager: EntityManager = this.dataSource.manager,
  ): Promise<ConsumptionOrderItemProgress[]> {
    const repos = this.getRepositories(manager);

    const items = await repos.consumptionOrderItem.find({
      where: { orderId, removedAt: IsNull() },
    });

    if (!items.length) return [];

    const changes = await repos.consumptionOrderChange.find({
      where: { itemId: In(items.map(({ id }) => id)) },
    });

    return items.map((item) => {
      const own = changes.filter((change) => change.itemId === item.id);

      const sum = (kind: ConsumptionChangeKind): number =>
        own
          .filter((change) => change.kind === kind)
          .reduce(
            (total, change) => total + Math.abs(Number(change.quantityChanged)),
            0,
          );

      const issued = sum(ConsumptionChangeKind.ISSUE);
      const returned = sum(ConsumptionChangeKind.RETURN);
      const settled = sum(ConsumptionChangeKind.SETTLE);

      return {
        itemId: item.id,
        target: Number(item.targetConsumedQuantity),
        issued,
        returned,
        settled,
        outstanding: issued - returned - settled,
      };
    });
  }

  /**
   * Hand material to the process: it leaves the source location and appears at
   * the consuming one. Nothing about the batch changes.
   */
  issue(options: ConsumptionOrderActionInput): Promise<boolean> {
    return this.act(options, ConsumptionChangeKind.ISSUE);
  }

  /** Take back material the process did not use. */
  return(options: ConsumptionOrderActionInput): Promise<boolean> {
    return this.act(options, ConsumptionChangeKind.RETURN);
  }

  /** Close out material the process used up: it leaves inventory. */
  settle(options: ConsumptionOrderActionInput): Promise<boolean> {
    return this.act(options, ConsumptionChangeKind.SETTLE);
  }

  private async act(
    options: ConsumptionOrderActionInput,
    kind: ConsumptionChangeKind,
  ): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      const repos = this.getRepositories(manager);

      const items = await repos.consumptionOrderItem.find({
        where: { orderId: options.orderId, removedAt: IsNull() },
      });

      if (!items.length) {
        throw new Error(`Consumption order ${options.orderId} has no items`);
      }

      const progress = await this.getProgress(options.orderId, manager);
      const progressById = new Map(
        progress.map((entry) => [entry.itemId, entry]),
      );

      const lines =
        options.items ??
        items.map((item) => ({ itemId: item.id, quantity: undefined }));

      for (const line of lines) {
        const item = items.find(({ id }) => id === line.itemId);

        if (!item) {
          throw new Error(
            `Item ${line.itemId} does not belong to consumption order ${options.orderId}`,
          );
        }

        const state = progressById.get(item.id);
        // `??` rather than `||`: a line whose remaining quantity is 0 must stay
        // 0 and be rejected below, not fall through to the whole target.
        const remaining =
          kind === ConsumptionChangeKind.ISSUE
            ? Number(item.targetConsumedQuantity) - (state?.issued ?? 0)
            : (state?.outstanding ?? 0);

        const quantity = line.quantity ?? remaining;

        if (quantity <= 0) {
          // Acting on the whole order is the common call, and an order where
          // some lines are already done is the common state; skipping them
          // beats making the caller compute the list.
          if (line.quantity === undefined) continue;

          throw new Error(
            `Consumption order line ${item.id} cannot move ${quantity}`,
          );
        }

        if (quantity > remaining) {
          throw new Error(
            kind === ConsumptionChangeKind.ISSUE
              ? `Consumption order line ${item.id} has only ${remaining} left to issue, asked for ${quantity}`
              : `Consumption order line ${item.id} has only ${remaining} outstanding, asked to ${kind.toLowerCase()} ${quantity}`,
          );
        }

        await this.writeMovement(repos, manager, item, kind, quantity);
      }

      return true;
    });
  }

  private async writeMovement(
    repos: ReturnType<typeof this.getRepositories>,
    manager: EntityManager,
    item: ConsumptionOrderItemEntityClass,
    kind: ConsumptionChangeKind,
    quantity: number,
  ): Promise<void> {
    const conversionFactor = await this.materialService.getConversionFactor(
      item.materialId,
      item.unitId || undefined,
    );
    const amount = quantity * conversionFactor;

    const source = {
      locationId: this.stockService.resolveLocationId(item.locationId),
      loaderId: this.stockService.resolveLoaderId(item.loaderId),
    };
    const target = {
      locationId: this.stockService.resolveLocationId(item.targetLocationId),
      loaderId: this.stockService.resolveLoaderId(item.targetLoaderId),
    };

    const movement: Movement =
      kind === ConsumptionChangeKind.ISSUE
        ? { from: source, to: target }
        : kind === ConsumptionChangeKind.RETURN
          ? { from: target, to: source }
          : { from: target, to: null };

    await this.stockService.validateStockAvailability(
      {
        materialId: item.materialId,
        batchId: item.batchId,
        locationId: movement.from.locationId,
        loaderId: movement.from.loaderId,
        quantity: amount,
      },
      manager,
    );

    const base = await repos.order.save({});

    await repos.consumptionOrderChange.save(
      repos.consumptionOrderChange.create({
        id: base.id,
        itemId: item.id,
        // The sign follows the stock the order controls: an issue puts material
        // into the process's hands, a return and a settlement take it back out.
        quantityChanged:
          kind === ConsumptionChangeKind.ISSUE ? amount : -1 * amount,
        kind,
      }),
    );

    const rows: DeepPartial<StockEntityClass>[] = [
      {
        orderId: base.id,
        materialId: item.materialId,
        batchId: item.batchId,
        locationId: movement.from.locationId,
        loaderId: movement.from.loaderId,
        quantity: -1 * amount,
      },
    ];

    if (movement.to) {
      rows.push({
        orderId: base.id,
        materialId: item.materialId,
        batchId: item.batchId,
        locationId: movement.to.locationId,
        loaderId: movement.to.loaderId,
        quantity: amount,
      });
    }

    await repos.stock.save(repos.stock.create(rows));
  }

  async findMany(options: FindConsumptionOrderInput): Promise<[T[], number]> {
    const queryBuilder = this.consumptionOrderRepository
      .createQueryBuilder('consumption')
      .leftJoinAndSelect('consumption.items', 'item');

    if (!options.includeRemoved) {
      queryBuilder.andWhere('consumption."removedAt" IS NULL');
    }

    if (options.ids?.length) {
      queryBuilder.andWhere('consumption.id IN (:...ids)', {
        ids: options.ids,
      });
    }

    if (options.key) {
      queryBuilder.andWhere('consumption.key ILIKE :key', {
        key: `%${options.key}%`,
      });
    }

    if (options.description) {
      queryBuilder.andWhere('consumption.description ILIKE :description', {
        description: `%${options.description}%`,
      });
    }

    if (options.createdBy) {
      queryBuilder.andWhere('consumption."createdBy" = :createdBy', {
        createdBy: options.createdBy,
      });
    }

    if (options.materialId) {
      queryBuilder.andWhere('item."materialId" = :materialId', {
        materialId: options.materialId,
      });
    }

    if (options.batchId) {
      queryBuilder.andWhere('item."batchId" = :batchId', {
        batchId: options.batchId,
      });
    }

    if (options.locationId) {
      queryBuilder.andWhere(
        '(item."locationId" = :locationId OR item."targetLocationId" = :locationId)',
        { locationId: options.locationId },
      );
    }

    if (options.createdAtFrom) {
      queryBuilder.andWhere('consumption."createdAt" >= :createdAtFrom', {
        createdAtFrom: options.createdAtFrom,
      });
    }

    if (options.createdAtTo) {
      queryBuilder.andWhere('consumption."createdAt" <= :createdAtTo', {
        createdAtTo: options.createdAtTo,
      });
    }

    queryBuilder.orderBy('consumption."createdAt"', 'DESC');

    if (options.offset !== undefined && options.offset >= 0) {
      queryBuilder.skip(options.offset);
    }

    if (options.limit !== undefined && options.limit > 0) {
      queryBuilder.take(options.limit);
    }

    return queryBuilder.getManyAndCount() as Promise<[T[], number]>;
  }

  findOne(id: string): Promise<T> {
    return this.consumptionOrderRepository.findOneOrFail({
      where: { id },
      relations: { items: true },
    } as never);
  }

  /** Every line of the given orders, for a DataLoader batching one round trip. */
  async findItemsByOrders(
    orderIds: readonly string[],
  ): Promise<ConsumptionOrderItemEntityClass[]> {
    if (!orderIds.length) return [];

    return this.dataSource
      .getRepository<ConsumptionOrderItemEntityClass>(
        this.consumptionOrderItemEntity,
      )
      .find({
        where: { orderId: In([...orderIds]), removedAt: IsNull() },
        order: { id: 'ASC' },
      });
  }
}
