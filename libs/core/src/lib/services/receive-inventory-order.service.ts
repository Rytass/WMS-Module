import { Inject, Injectable } from '@nestjs/common';
import {
  ReceiveInventoryOrderEntity,
  ReceiveInventoryOrderEntityClass,
} from '../models/extensions/receive-inventory-order/receive-inventory-order.entity';
import {
  ReceiveInventoryOrderItemEntity,
  ReceiveInventoryOrderItemEntityClass,
} from '../models/extensions/receive-inventory-order/receive-inventory-order-item.entity';
import {
  DataSource,
  DeepPartial,
  EntityManager,
  In,
  IsNull,
  SelectQueryBuilder,
  type EntityTarget,
} from 'typeorm';
import {
  CreateReceiveInventoryOrderInput,
  CreateReceiveInventoryOrderItemInput,
  UpdateReceiveInventoryOrderInput,
} from '../typings/create-receive-inventory-order.input';
import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import {
  FindReceiveInventoryOrderInput,
  ReceiveInventoryOrderStatus,
} from '../typings/find-receive-inventory-order.input';
import {
  LoadersEntityClass,
  LocationEntityClass,
  MaterialEntityClass,
  ReceiveInventoryOrderChangeEntityClass,
  StockEntityClass,
} from '../models';
import { ReceiveInventoryOrderInput } from '../typings/receive-inventory-order.input';
import { MaterialService } from './material.service';
import { BatchService } from './batch.service';
import { HelperService } from './helper.service';
import { StockService } from './stock.service';
import { runInTransaction } from '../utils/run-in-transaction';
import { WmsEntities } from '../models/wms-entities';
import { quotedTablePathOf, tablePathOf } from '../utils/table-path';

/**
 * Service for managing receive inventory orders and their items
 * Supports dynamic entity injection for customization
 * T - Receive Inventory Order entity type
 * K - Receive Inventory Order Item entity type
 */
@Injectable()
export class ReceiveInventoryOrderService<
  T extends ReceiveInventoryOrderEntityClass = ReceiveInventoryOrderEntityClass,
  K extends
    ReceiveInventoryOrderItemEntityClass = ReceiveInventoryOrderItemEntityClass,
> {
  readonly selectQueryBuilder: (alias: string) => SelectQueryBuilder<T>;
  constructor(
    private readonly dataSource: DataSource,
    private readonly entities: WmsEntities,
    private readonly materialService: MaterialService,
    private readonly batchService: BatchService,
    private readonly helperService: HelperService,
    private readonly stockService: StockService,
    @Inject(ReceiveInventoryOrderEntity)
    readonly receiveInventoryOrderEntity: EntityTarget<T>,
    @Inject(ReceiveInventoryOrderItemEntity)
    readonly receiveInventoryOrderItemEntity: EntityTarget<K>,
  ) {
    this.selectQueryBuilder = (alias: string) => {
      const changes = quotedTablePathOf(
        this.dataSource,
        ReceiveInventoryOrderChangeEntityClass,
      );
      const items = quotedTablePathOf(
        this.dataSource,
        this.receiveInventoryOrderItemEntity,
      );

      return this.dataSource
        .getRepository<T>(this.receiveInventoryOrderEntity)
        .createQueryBuilder(alias)
        .leftJoin(
          (subQuery) =>
            subQuery
              .select(
                `CASE
                  WHEN o."removedAt" IS NOT NULL THEN '${ReceiveInventoryOrderStatus.REMOVED}'
                  WHEN COALESCE((
                    SELECT SUM(CAST(c."quantityChanged" AS NUMERIC))
                    FROM ${changes} c
                    JOIN ${items} i ON c."itemId" = i.id
                    WHERE i."orderId" = o.id
                  ), 0) = COALESCE(target_sum.targetsum, 0) AND COALESCE(target_sum.targetsum, 0) > 0 THEN '${ReceiveInventoryOrderStatus.RECEIVED}'
                  WHEN COALESCE((
                    SELECT SUM(CAST(c."quantityChanged" AS NUMERIC))
                    FROM ${changes} c
                    JOIN ${items} i ON c."itemId" = i.id
                    WHERE i."orderId" = o.id
                  ), 0) > 0 AND COALESCE((
                    SELECT SUM(CAST(c."quantityChanged" AS NUMERIC))
                    FROM ${changes} c
                    JOIN ${items} i ON c."itemId" = i.id
                    WHERE i."orderId" = o.id
                  ), 0) < COALESCE(target_sum.targetsum, 0) THEN '${ReceiveInventoryOrderStatus.PARTIAL_RECEIVED}'
                  ELSE '${ReceiveInventoryOrderStatus.PENDING}'
                END`,
                'status',
              )
              .addSelect('o.id', 'orderid')
              .from(
                tablePathOf(this.dataSource, this.receiveInventoryOrderEntity),
                'o',
              )
              .leftJoin(
                (sumQuery) =>
                  sumQuery
                    .select('i."orderId"', 'orderid')
                    .addSelect(
                      'SUM(CAST(i."targetReceivedQuantity" AS NUMERIC))',
                      'targetsum',
                    )
                    .from(
                      tablePathOf(
                        this.dataSource,
                        this.receiveInventoryOrderItemEntity,
                      ),
                      'i',
                    )
                    .groupBy('i."orderId"'),
                'target_sum',
                'target_sum.orderid = o.id',
              ),
          'order_status',
          `${alias}.id = order_status.orderid`,
        )
        .select('orders.id', 'id')
        .addSelect('orders.key', 'key')
        .addSelect('orders.description', 'description')
        .addSelect('orders."createdBy"', 'createdBy')
        .addSelect('orders."createdAt"', 'createdAt')
        .addSelect('orders."removedAt"', 'removedAt')
        .addSelect('order_status.status', `status`);
    };
  }

  private processReceiveInventoryOrderItems(
    items: CreateReceiveInventoryOrderItemInput[],
    orderId: string,
    manager: EntityManager,
  ): Promise<DeepPartial<ReceiveInventoryOrderItemEntityClass>[]> {
    const materialRepository = manager.getRepository<MaterialEntityClass>(
      this.materialService.materialEntity,
    );
    const locationRepository = manager.getRepository<LocationEntityClass>(
      this.entities.location,
    );
    const loaderRepository =
      manager.getRepository<LoadersEntityClass>(LoadersEntityClass);

    return items.reduce(
      async (accPromise, item) => {
        const acc = await accPromise;

        try {
          const material = await materialRepository.findOneBy({
            key: item.materialKey,
          });
          if (!material) return acc;
          const batch = item.batchKey
            ? await this.batchService.getBatch({
                manager,
                materialId: material.id,
                key: item.batchKey,
              })
            : null;

          const location = item.locationKey
            ? await locationRepository.findOneBy({
                key: item.locationKey,
              })
            : null;

          const loader = item.loaderKey
            ? await loaderRepository.findOneBy({
                serialId: item.loaderKey,
              })
            : null;

          return [
            ...acc,
            {
              ...item,
              orderId,
              materialId: material.id,
              batchId: batch?.id || null,
              locationId: this.stockService.resolveLocationId(location?.id),
              loaderId: loader?.id || null,
            },
          ];
        } catch {
          return acc;
        }
      },
      Promise.resolve(
        [] as DeepPartial<ReceiveInventoryOrderItemEntityClass>[],
      ),
    );
  }

  async createReceiveInventoryOrder({
    manager: outerManager,
    ...options
  }: CreateReceiveInventoryOrderInput & {
    manager?: EntityManager;
  }): Promise<T> {
    return runInTransaction(this.dataSource, outerManager, async (manager) => {
      const orderRepository = manager.getRepository<OrderEntity>(
        this.entities.order,
      );
      const receiveInventoryOrderRepository =
        manager.getRepository<ReceiveInventoryOrderEntityClass>(
          this.receiveInventoryOrderEntity,
        );
      const receiveInventoryOrderItemRepository =
        manager.getRepository<ReceiveInventoryOrderItemEntityClass>(
          this.receiveInventoryOrderItemEntity,
        );

      // create base order
      const { id } = await orderRepository.save(orderRepository.create());

      // create receive inventory order
      const { items, ...orderOptions } = options;
      const order = await receiveInventoryOrderRepository.save(
        receiveInventoryOrderRepository.create({ id, ...orderOptions }),
      );

      // create receive inventory order items
      if (items && items.length > 0) {
        const processedItems: ReceiveInventoryOrderItemEntityClass[] =
          receiveInventoryOrderItemRepository.create(
            await this.processReceiveInventoryOrderItems(items, id, manager),
          );
        await receiveInventoryOrderItemRepository.save(processedItems);
      }

      return order as T;
    });
  }

  /**
   * Update a receive inventory order and its items
   * update existing item when id is provided, otherwise create new item, remove behaviour controlled by removedAt field
   */
  async updateReceiveInventoryOrder({
    id,
    manager: outerManager,
    ...options
  }: UpdateReceiveInventoryOrderInput & {
    manager?: EntityManager;
  }): Promise<T> {
    return runInTransaction(this.dataSource, outerManager, async (manager) => {
      const receiveInventoryOrderRepository =
        manager.getRepository<ReceiveInventoryOrderEntityClass>(
          this.receiveInventoryOrderEntity,
        );
      const receiveInventoryOrderItemRepository =
        manager.getRepository<ReceiveInventoryOrderItemEntityClass>(
          this.receiveInventoryOrderItemEntity,
        );

      const order = await receiveInventoryOrderRepository.findOneByOrFail({
        id,
        removedAt: IsNull(),
      });

      const { items, ...orderOptions } = options;
      const updated = await receiveInventoryOrderRepository.save(
        receiveInventoryOrderRepository.create({
          ...order,
          ...orderOptions,
        }),
      );

      if (items?.length) {
        const newItems: Partial<CreateReceiveInventoryOrderItemInput>[] = [];
        const existingItems: Partial<ReceiveInventoryOrderItemEntityClass>[] =
          [];

        await receiveInventoryOrderItemRepository
          .find({ where: { orderId: id } })
          .then((items) => {
            const itemSet = new Set(items.map((i) => i.id));
            options.items?.forEach((item) => {
              if (!item.id) newItems.push(item);
              else if (itemSet.has(item.id)) existingItems.push(item);
            });
          });

        if (newItems.length)
          await receiveInventoryOrderItemRepository.save(
            receiveInventoryOrderItemRepository.create(
              await this.processReceiveInventoryOrderItems(
                newItems as CreateReceiveInventoryOrderItemInput[],
                id,
                manager,
              ),
            ),
          );

        if (existingItems.length)
          await receiveInventoryOrderItemRepository.save(
            existingItems.map((item) =>
              receiveInventoryOrderItemRepository.create({
                ...item,
                id: item.id,
              }),
            ),
          );
      }

      return updated as T;
    });
  }

  async removeReceiveInventoryOrder(
    id: string,
    manager: EntityManager = this.dataSource.manager,
  ): Promise<boolean> {
    return manager
      .getRepository<ReceiveInventoryOrderEntityClass>(
        this.receiveInventoryOrderEntity,
      )
      .update({ id }, { removedAt: new Date() })
      .then(({ affected }) => !!affected && affected > 0);
  }

  async findMany(
    options: FindReceiveInventoryOrderInput<T>,
  ): Promise<[T[], number]> {
    const queryBuilder = this.selectQueryBuilder('orders');

    if (options.id)
      queryBuilder.andWhere('orders.id = :id', { id: options.id });

    if (options.createdBy)
      queryBuilder.andWhere('orders."createdBy" ILIKE :createdBy', {
        createdBy: `%${options.createdBy}%`,
      });

    if (options.description)
      queryBuilder.andWhere('orders.description ILIKE :description', {
        description: `%${options.description}%`,
      });

    if (options.dateRange)
      queryBuilder.andWhere('orders."createdAt" BETWEEN :from AND :to', {
        from: options.dateRange.from,
        to: options.dateRange.to,
      });

    if (options.status)
      queryBuilder.andWhere(`status = :status`, {
        status: options.status,
      });

    if (options.statuses && options.statuses.length > 0)
      queryBuilder.andWhere(`status IN (:...statuses)`, {
        statuses: options.statuses,
      });

    if (options.materialKey)
      queryBuilder.andWhere(
        `EXISTS (
          SELECT 1 FROM ${quotedTablePathOf(this.dataSource, this.receiveInventoryOrderItemEntity)} ri_items
          INNER JOIN ${quotedTablePathOf(this.dataSource, this.entities.material)} ri_mat ON ri_mat.id = ri_items."materialId"
          WHERE ri_items."orderId" = orders.id
          AND ri_mat.key ILIKE :materialKey
        )`,
        { materialKey: `%${options.materialKey}%` },
      );

    if (options.batchKey)
      queryBuilder.andWhere(
        `EXISTS (
          SELECT 1 FROM ${quotedTablePathOf(this.dataSource, this.receiveInventoryOrderItemEntity)} ri_items
          INNER JOIN ${quotedTablePathOf(this.dataSource, this.entities.batch)} ri_batch ON ri_batch.id = ri_items."batchId"
          WHERE ri_items."orderId" = orders.id
          AND ri_batch.key ILIKE :batchKey
        )`,
        { batchKey: `%${options.batchKey}%` },
      );

    if (options.locationKey)
      queryBuilder.andWhere(
        `EXISTS (
          SELECT 1 FROM ${quotedTablePathOf(this.dataSource, this.receiveInventoryOrderItemEntity)} ri_items
          INNER JOIN ${quotedTablePathOf(this.dataSource, this.entities.location)} ri_loc ON ri_loc.id = ri_items."locationId"
          WHERE ri_items."orderId" = orders.id
          AND ri_loc.key ILIKE :locationKey
        )`,
        { locationKey: `%${options.locationKey}%` },
      );

    if (options.loaderKey)
      queryBuilder.andWhere(
        `EXISTS (
          SELECT 1 FROM ${quotedTablePathOf(this.dataSource, this.receiveInventoryOrderItemEntity)} ri_items
          INNER JOIN ${quotedTablePathOf(this.dataSource, LoadersEntityClass)} ri_ldr ON ri_ldr.id = ri_items."loaderId"
          WHERE ri_items."orderId" = orders.id
          AND ri_ldr."serialId" ILIKE :loaderKey
        )`,
        { loaderKey: `%${options.loaderKey}%` },
      );

    if (options.wildcard) {
      const { key, value } = options.wildcard;
      queryBuilder.andWhere(`orders."${String(key)}" ILIKE :value`, {
        value: `%${value}%`,
      });
    }

    const total = await queryBuilder.getCount();

    // This is a raw query (`getRawMany`, because `status` is computed by the
    // `order_status` join and has no column to hydrate into). `skip`/`take`
    // are entity-mode pagination: with a join on the builder TypeORM drops
    // them from a raw query without a word, and the list came back whole.
    // `offset`/`limit` go straight into the SQL. The join is one row per
    // order, so a page is exactly `limit` orders — and a page is only a page
    // with a stable order underneath it.
    queryBuilder
      .orderBy('orders."createdAt"', 'DESC')
      .addOrderBy('orders.id', 'ASC');

    if (options.offset !== undefined && options.offset >= 0)
      queryBuilder.offset(options.offset);

    if (options.limit !== undefined && options.limit > 0)
      queryBuilder.limit(options.limit);

    const items = await queryBuilder.getRawMany();

    return [items, total];
  }

  receive(
    options: ReceiveInventoryOrderInput[] | ReceiveInventoryOrderInput,
    outerManager?: EntityManager,
  ): Promise<boolean> {
    if (!Array.isArray(options)) options = [options];

    return runInTransaction(this.dataSource, outerManager, async (manager) => {
      const changeRepository =
        manager.getRepository<ReceiveInventoryOrderChangeEntityClass>(
          ReceiveInventoryOrderChangeEntityClass,
        );
      const itemRepository =
        manager.getRepository<ReceiveInventoryOrderItemEntityClass>(
          this.receiveInventoryOrderItemEntity,
        );
      const orderRepository = manager.getRepository<OrderEntity>(
        this.entities.order,
      );
      const locationRepository = manager.getRepository<LocationEntityClass>(
        this.entities.location,
      );
      const loaderRepository =
        manager.getRepository<LoadersEntityClass>(LoadersEntityClass);
      const stockRepository = manager.getRepository<StockEntityClass>(
        this.entities.stock,
      );
      const batchRepository = manager.getRepository(this.entities.batch);

      const items = await itemRepository.find({
        where: { id: In(options.map((o) => o.itemId)) },
        relations: { changes: true },
      });
      const itemMap = new Map(items.map((i) => [i.id, i]));

      /*
       * Sequential, not `Promise.all`. Two options for one item both reach the
       * batch lookups below before either has written, so `splitBatch`'s
       * read-then-create misses twice and one receipt ends up fragmented across
       * two batch identities. A receive order has a handful of lines; ordering
       * them costs nothing worth measuring.
       */
      for (const option of options) {
        await (async () => {
          const item = itemMap.get(option.itemId);
          if (!item) return;
          if (!item.batchId && option.batchKey) {
            // if batchKey is provided but item doesn't have batchId, attempt to find or create batch and update item with batchId
            item.batchId = await this.batchService
              .getBatch({
                manager,
                key: option.batchKey,
                materialId: item.materialId,
              })
              .then(async (b) => {
                await itemRepository.update({ id: item.id }, { batchId: b.id });
                return b.id;
              });
          }

          const conversionFactor =
            await this.materialService.getConversionFactor(
              item.materialId,
              item.unitId || undefined,
              manager,
            );

          const totalChanged = item.changes.reduce(
            (sum, change) => sum + Number(change.quantityChanged),
            0,
          );

          const remainingQuantity =
            conversionFactor * item.targetReceivedQuantity - totalChanged;

          if (remainingQuantity - option.quantity * conversionFactor < 0) {
            throw new Error(
              `Receiving quantity exceeds target for item ${option.itemId}`,
            );
          }

          const newOrder = await orderRepository.save(orderRepository.create());
          let batchId = item.batchId;
          if (option.batchKey)
            batchId = await this.batchService
              .getBatch({
                manager,
                key: option.batchKey,
                materialId: item.materialId,
              })
              .then(({ id }) => id);
          if (!batchId)
            batchId = await this.batchService
              .getBatch({
                manager,
                key: await this.helperService.getSeq('BATCH', manager),
                materialId: item.materialId,
              })
              .then(({ id }) => id);

          /*
           * Only an explicit result splits the receipt off as inspected.
           * `requireInspection: false` used to be read as "already inspected and
           * passed", which always split a child `<batchKey>_<timestamp>` off
           * the batch the caller named -- so a plain goods receipt into lot `B`
           * could never land on `B` (#184). It now means what it says: no
           * inspection state, receive onto the named batch as it is. A caller
           * that really is receiving already-inspected goods says so with
           * `inspectionResult: true`.
           */
          const inspectionResult = option.inspectionResult ?? null;

          if (inspectionResult != null) {
            batchId = await this.batchService
              .splitBatch({
                manager,
                id: batchId as string,
                inspectionResult,
              })
              .then(({ id }) => id);
          } else if (item.requireInspection) {
            /*
             * Somebody asked for this to be inspected and it has not been yet.
             * Recording that on the batch is what lets `PENDING_INSPECTION`
             * mean "awaiting inspection" rather than "never inspected" -- the
             * latter being true of almost every batch in the warehouse.
             *
             * Split only when the batch already holds something. `require-
             * Inspection` defaults to **true**, so this is the ordinary receive
             * path, not an edge case: splitting unconditionally moved every
             * default receipt off the batch key the caller asked for and onto a
             * synthetic child, which an exact-id lookup then could not find.
             *
             * A batch with nothing on it yet has nothing to commingle with, so
             * flagging it in place is both sufficient and invisible. Only a
             * receipt joining stock that is already there needs its own batch,
             * which is the same thing holding or shipping part of a batch does.
             */
            const onHand = await stockRepository
              .createQueryBuilder('stock')
              .select('COALESCE(SUM(stock.quantity), 0)', 'total')
              .where('stock."batchId" = :batchId', { batchId })
              .getRawOne<{ total: string }>()
              .then((row) => parseFloat(row?.total ?? '0'));

            if (onHand > 0) {
              batchId = await this.batchService
                .splitBatch({
                  manager,
                  id: batchId as string,
                  requiresInspection: true,
                })
                .then(({ id }) => id);
            } else {
              await batchRepository.update({ id: batchId as string }, {
                requiresInspection: true,
              } as never);
            }
          }

          let locationId = item.locationId;
          if (option.locationKey && !locationId)
            locationId = await locationRepository
              .findOneByOrFail({ key: option.locationKey })
              .then(({ id }) => id);

          let loaderId = item.loaderId;
          if (option.loaderKey && !loaderId)
            loaderId = await loaderRepository
              .findOneByOrFail({ serialId: option.loaderKey })
              .then(({ id }) => id);

          await Promise.all([
            changeRepository.save(
              changeRepository.create({
                itemId: option.itemId,
                quantityChanged: option.quantity * conversionFactor,
                id: newOrder.id,
              }),
            ),
            stockRepository.save(
              stockRepository.create({
                batchId: batchId || undefined,
                locationId: this.stockService.resolveLocationId(locationId),
                loaderId: this.stockService.resolveLoaderId(loaderId),
                materialId: item.materialId,
                quantity: option.quantity * conversionFactor,
                orderId: newOrder.id,
              }),
            ),
          ]);
        })();
      }

      return true;
    });
  }
}
