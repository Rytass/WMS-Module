import { Inject, Injectable } from '@nestjs/common';
import {
  ShipInventoryOrderEntity,
  ShipInventoryOrderEntityClass,
} from '../models/extensions/ship-inventory-order/ship-inventory-order.entity';
import {
  ShipInventoryOrderItemEntity,
  ShipInventoryOrderItemEntityClass,
} from '../models/extensions/ship-inventory-order/ship-inventory-order-item.entity';
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
  CreateShipInventoryOrderInput,
  CreateShipInventoryOrderItemInput,
  CreateShipInventoryOrderItemsInput,
  UpdateShipInventoryOrderInput,
} from '../typings/create-ship-inventory-order.input';
import {
  FindShipInventoryOrderInput,
  ShipInventoryOrderStatus,
} from '../typings/find-ship-inventory-order.input';
import { OrderEntity, BatchEntity } from '@rytass/wms-base-nestjs-module';
import {
  ShipInventoryOrderChangeEntityClass,
  LoadersEntityClass,
  ShipInventoryOrderReferenceEntity,
  ShipInventoryOrderReferenceEntityClass,
  MaterialEntityClass,
  StockEntityClass,
  SaleOrderEntity,
  SaleOrderEntityClass,
} from '../models';
import { ShipInventoryOrderInput } from '../typings/ship-inventory-order.input';
import { CancelShipInventoryOrderInput } from '../typings/cancel-ship-inventory-order.input';
import { MaterialService } from './material.service';
import { BatchService } from './batch.service';
import { CreateShipInventoryOrderReferenceInput } from '../typings/create-ship-inventory-order.input';
import { StockService } from './stock.service';
import { runInTransaction } from '../utils/run-in-transaction';
import { WmsEntities } from '../models/wms-entities';
import { quotedTablePathOf, tablePathOf } from '../utils/table-path';

/**
 * Service for managing ship inventory orders and their items
 * Supports dynamic entity injection for customization
 * T - Ship Inventory Order entity type
 * K - Ship Inventory Order Item entity type
 */
@Injectable()
export class ShipInventoryOrderService<
  T extends ShipInventoryOrderEntityClass = ShipInventoryOrderEntityClass,
  K extends
    ShipInventoryOrderItemEntityClass = ShipInventoryOrderItemEntityClass,
> {
  readonly selectQueryBuilder: (alias: string) => SelectQueryBuilder<T>;

  constructor(
    private readonly dataSource: DataSource,
    private readonly entities: WmsEntities,
    private readonly materialService: MaterialService,
    private readonly batchService: BatchService,
    private readonly stockService: StockService,
    @Inject(ShipInventoryOrderEntity)
    readonly shipInventoryOrderEntity: EntityTarget<T>,
    @Inject(ShipInventoryOrderItemEntity)
    readonly shipInventoryOrderItemEntity: EntityTarget<K>,
    @Inject(ShipInventoryOrderReferenceEntity)
    readonly shipInventoryOrderReferenceEntity: EntityTarget<ShipInventoryOrderReferenceEntityClass>,
    @Inject(SaleOrderEntity)
    readonly saleOrderEntity: EntityTarget<SaleOrderEntityClass>,
  ) {
    this.selectQueryBuilder = (alias: string) => {
      return this.dataSource
        .getRepository<T>(this.shipInventoryOrderEntity)
        .createQueryBuilder(alias)
        .leftJoin(
          (subQuery) =>
            subQuery
              .select(
                `CASE
                  WHEN o."removedAt" IS NOT NULL THEN '${ShipInventoryOrderStatus.REMOVED}'
                  WHEN COALESCE(change_sums.shippedsum, 0) >= COALESCE(target_sum.targetsum, 0) AND COALESCE(target_sum.targetsum, 0) > 0 THEN '${ShipInventoryOrderStatus.SHIPPED}'
                  WHEN COALESCE(change_sums.shippedsum, 0) > 0 AND COALESCE(change_sums.shippedsum, 0) < COALESCE(target_sum.targetsum, 0) THEN '${ShipInventoryOrderStatus.PARTIAL_SHIPPED}'
                  ELSE '${ShipInventoryOrderStatus.PENDING}'
                END`,
                'status',
              )
              .addSelect('o.id', 'orderid')
              .from(
                tablePathOf(this.dataSource, this.shipInventoryOrderEntity),
                'o',
              )
              .leftJoin(
                (sumQuery) =>
                  sumQuery
                    .select('i."orderId"', 'orderid')
                    .addSelect(
                      `SUM(CAST(i."targetShippedQuantity" AS NUMERIC))`,
                      'targetsum',
                    )
                    .from(
                      tablePathOf(
                        this.dataSource,
                        this.shipInventoryOrderItemEntity,
                      ),
                      'i',
                    )
                    .groupBy('i."orderId"'),
                'target_sum',
                'target_sum.orderid = o.id',
              )
              .leftJoin(
                (sumQuery) =>
                  sumQuery
                    .select('i."orderId"', 'orderid')
                    .addSelect(
                      `SUM(CASE WHEN CAST(c."quantityChanged" AS NUMERIC) < 0 THEN ABS(CAST(c."quantityChanged" AS NUMERIC)) ELSE 0 END)`,
                      'shippedsum',
                    )
                    .from(
                      tablePathOf(
                        this.dataSource,
                        ShipInventoryOrderChangeEntityClass,
                      ),
                      'c',
                    )
                    // The entity, not its table path: a schema-qualified path
                    // reads to TypeORM as `<alias>.<relation>` in a join.
                    .innerJoin(
                      this.dataSource.getMetadata(
                        this.shipInventoryOrderItemEntity,
                      ).target,
                      'i',
                      'c."itemId" = i.id',
                    )
                    .groupBy('i."orderId"'),
                'change_sums',
                'change_sums.orderid = o.id',
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

  private processShipInventoryOrderReferences(
    references: Partial<CreateShipInventoryOrderReferenceInput>[],
    manager: EntityManager,
  ): Promise<DeepPartial<ShipInventoryOrderReferenceEntityClass>[]> {
    const materialRepository = manager.getRepository<MaterialEntityClass>(
      this.materialService.materialEntity,
    );
    const saleOrderRepository = manager.getRepository<SaleOrderEntityClass>(
      this.saleOrderEntity,
    );
    return references.reduce(
      async (accPromise, reference) => {
        const acc = await accPromise;

        try {
          const material = await materialRepository.findOneBy({
            key: reference.materialKey,
          });
          if (!material) return acc;

          if (reference.saleId && reference.saleSerialId)
            await saleOrderRepository.save(
              saleOrderRepository.create({
                id: reference.saleId,
                serialId: reference.saleSerialId,
              }),
            );
          return [
            ...acc,
            {
              ...reference,
              materialId: material.id,
            },
          ];
        } catch {
          return acc;
        }
      },
      Promise.resolve(
        [] as DeepPartial<ShipInventoryOrderReferenceEntityClass>[],
      ),
    );
  }

  private async processShipInventoryOrderItems(
    items: Partial<ShipInventoryOrderItemEntityClass>[],
    manager: EntityManager,
  ): Promise<void> {
    const shipInventoryOrderItemRepository =
      manager.getRepository<ShipInventoryOrderItemEntityClass>(
        this.shipInventoryOrderItemEntity,
      );
    const shipInventoryOrderChangeRepository =
      manager.getRepository<ShipInventoryOrderChangeEntityClass>(
        ShipInventoryOrderChangeEntityClass,
      );
    const orderRepository = manager.getRepository<OrderEntity>(
      this.entities.order,
    );
    const stockRepository = manager.getRepository<StockEntityClass>(
      this.entities.stock,
    );

    // Every (material, batch) this call deducts from, locked up front in a
    // fixed order so overlapping operations cannot deadlock each other.
    await this.stockService.lockStockSlots(items, manager);
    for (const data of items) {
      await (async () => {
        // Ensure required fields are present
        if (!data.batchId || !data.materialId) return;

        // Split batch first with inShipment flag to track shipment state
        const splittedBatch = await this.batchService.splitBatch({
          id: data.batchId,
          inShipment: true,
          manager,
        });

        // Save item with ORIGINAL batch id to maintain source state
        const item = await shipInventoryOrderItemRepository.save(
          shipInventoryOrderItemRepository.create(data),
        );
        const base = await orderRepository.save(orderRepository.create());
        const conversionFactor = await this.materialService.getConversionFactor(
          item.materialId,
          item.unitId || undefined,
          manager,
        );

        await shipInventoryOrderChangeRepository.save(
          shipInventoryOrderChangeRepository.create({
            itemId: item.id,
            id: base.id,
            quantityChanged: item.targetShippedQuantity * conversionFactor,
          }),
        );

        // Stock movements track the shipment through splitted batch
        await this.stockService.validateStockAvailability(
          {
            materialId: item.materialId,
            batchId: item.batchId,
            locationId: this.stockService.resolveLocationId(item.locationId),
            loaderId: this.stockService.resolveLoaderId(item.loaderId),
            quantity: item.targetShippedQuantity * conversionFactor,
          },
          manager,
        );

        await stockRepository.save(
          stockRepository.create([
            // deduct from original batch available stock
            {
              orderId: base.id,
              materialId: item.materialId,
              batchId: item.batchId, // original batch
              locationId: this.stockService.resolveLocationId(item.locationId),
              loaderId: this.stockService.resolveLoaderId(item.loaderId),
              quantity: -1 * item.targetShippedQuantity * conversionFactor,
            } as DeepPartial<StockEntityClass>,
            // add to splitted batch in shipment state
            {
              orderId: base.id,
              materialId: item.materialId,
              batchId: splittedBatch.id, // splitted batch marked inShipment
              locationId: this.stockService.resolveLocationId(item.locationId),
              loaderId: this.stockService.resolveLoaderId(item.loaderId),
              quantity: item.targetShippedQuantity * conversionFactor,
            } as DeepPartial<StockEntityClass>,
          ]),
        );
      })();
    }
  }

  async createShipInventoryOrder({
    manager: outerManager,
    ...options
  }: CreateShipInventoryOrderInput & { manager?: EntityManager }): Promise<T> {
    return runInTransaction(this.dataSource, outerManager, async (manager) => {
      const orderRepository = manager.getRepository<OrderEntity>(
        this.entities.order,
      );
      const shipInventoryOrderRepository =
        manager.getRepository<ShipInventoryOrderEntityClass>(
          this.shipInventoryOrderEntity,
        );
      const shipInventoryOrderReferenceRepository =
        manager.getRepository<ShipInventoryOrderReferenceEntityClass>(
          this.shipInventoryOrderReferenceEntity,
        );

      // create base order
      const { id } = await orderRepository.save(orderRepository.create());

      // create ship inventory order
      const order = await shipInventoryOrderRepository.save(
        shipInventoryOrderRepository.create({ id, ...options }),
      );

      // create ship inventory order references
      if (options.references && options.references.length > 0) {
        const processedReferences =
          await this.processShipInventoryOrderReferences(
            options.references,
            manager,
          );
        if (processedReferences.length > 0) {
          const references = shipInventoryOrderReferenceRepository.create(
            processedReferences.map((reference) => ({
              ...reference,
              orderId: order.id,
            })),
          );
          await shipInventoryOrderReferenceRepository.save(references);
        }
      }

      return order as T;
    });
  }

  /**
   * Update a ship inventory order and its items
   * update existing item when id is provided, otherwise create new item, remove behaviour controlled by removedAt field
   */
  async updateShipInventoryOrder({
    id,
    manager: outerManager,
    ...options
  }: UpdateShipInventoryOrderInput & { manager?: EntityManager }): Promise<T> {
    return runInTransaction(this.dataSource, outerManager, async (manager) => {
      const shipInventoryOrderRepository =
        manager.getRepository<ShipInventoryOrderEntityClass>(
          this.shipInventoryOrderEntity,
        );
      const shipInventoryOrderReferenceRepository =
        manager.getRepository<ShipInventoryOrderReferenceEntityClass>(
          this.shipInventoryOrderReferenceEntity,
        );

      const shipInventoryOrderItemRepository =
        manager.getRepository<ShipInventoryOrderItemEntityClass>(
          this.shipInventoryOrderItemEntity,
        );
      const materialRepository = manager.getRepository<MaterialEntityClass>(
        this.materialService.materialEntity,
      );

      const order = await shipInventoryOrderRepository.findOneByOrFail({
        id,
        removedAt: IsNull(),
      });
      const { references, items, ...orderOptions } = options;
      const updated = await shipInventoryOrderRepository.save(
        shipInventoryOrderRepository.create({
          ...order,
          ...orderOptions,
        }),
      );

      if (references?.length) {
        const newItems: Partial<ShipInventoryOrderReferenceEntityClass>[] = [];
        const existingItems: Partial<ShipInventoryOrderReferenceEntityClass>[] =
          [];

        const items = await shipInventoryOrderReferenceRepository.find({
          where: { orderId: id, removedAt: IsNull() },
        });
        const itemSet = new Set(items.map((i) => i.id));

        // Sequential: `getBatch` is find-or-create, and two references naming
        // one new batch key would both miss and both insert.
        const results: {
          item: (typeof references)[number];
          batch: BatchEntity | null;
        }[] = [];
        for (const item of references || []) {
          let batch: BatchEntity | null = null;
          if (item.batchKey) {
            const material = await materialRepository.findOneByOrFail({
              key: item.materialKey,
            });
            batch = await this.batchService.getBatch({
              manager,
              materialId: material.id,
              key: item.batchKey,
            });
          }
          results.push({ item, batch });
        }

        // Now process results after all async operations are complete
        results.forEach((result) => {
          if (!result) return;
          const { item, batch } = result;
          if (!item.id) newItems.push({ ...item, batchId: batch?.id || null });
          else if (itemSet.has(item.id))
            existingItems.push({ ...item, batchId: batch?.id || null });
        });

        if (newItems.length) {
          const processedNewItems =
            await this.processShipInventoryOrderReferences(newItems, manager);
          if (processedNewItems.length > 0) {
            await shipInventoryOrderReferenceRepository.save(
              shipInventoryOrderReferenceRepository.create(
                processedNewItems.map((item) => ({ ...item, orderId: id })),
              ),
            );
          }
        }
        if (existingItems.length)
          await shipInventoryOrderReferenceRepository.save(
            existingItems.map((item) =>
              shipInventoryOrderReferenceRepository.create({
                ...item,
                id: item.id,
              }),
            ),
          );
      }

      if (items?.length) {
        const newItems: Partial<CreateShipInventoryOrderItemInput>[] = [];
        const existingItems: Partial<ShipInventoryOrderItemEntityClass>[] = [];

        await shipInventoryOrderItemRepository
          .find({ where: { orderId: id, removedAt: IsNull() } })
          .then((dbItems) => {
            const itemSet = new Set(dbItems.map((i) => i.id));
            items?.forEach((item) => {
              if (!item.id) newItems.push({ ...item, orderId: id });
              else if (itemSet.has(item.id)) existingItems.push(item);
            });
          });

        if (newItems.length)
          await this.processShipInventoryOrderItems(newItems, manager);
        if (existingItems.length)
          await shipInventoryOrderItemRepository.save(
            existingItems.map((item) =>
              shipInventoryOrderItemRepository.create({
                ...item,
                id: item.id,
              }),
            ),
          );
      }

      return updated as T;
    });
  }

  /**
   * Remove a ship inventory order
   * Automatically cancels all remaining prepared (but not shipped) items to release stock
   */
  async removeShipInventoryOrder(
    id: string,
    outerManager?: EntityManager,
  ): Promise<boolean> {
    return runInTransaction(this.dataSource, outerManager, async (manager) => {
      const shipInventoryOrderRepository =
        manager.getRepository<ShipInventoryOrderEntityClass>(
          this.shipInventoryOrderEntity,
        );
      const itemRepository =
        manager.getRepository<ShipInventoryOrderItemEntityClass>(
          this.shipInventoryOrderItemEntity,
        );

      // Find order
      const order = await shipInventoryOrderRepository.findOne({
        where: { id },
      });
      if (!order || order.removedAt) return false;

      // Find all items with changes to calculate cancellable quantities
      const items = await itemRepository.find({
        where: { orderId: id },
        relations: { changes: true },
      });

      // Build cancel inputs for items with remaining prepared quantity
      const cancelInputs: CancelShipInventoryOrderInput[] = [];
      for (const item of items) {
        const conversionFactor = await this.materialService.getConversionFactor(
          item.materialId,
          item.unitId || undefined,
          manager,
        );

        const preparedQuantity = item.changes.reduce((sum, change) => {
          const qty = Number(change.quantityChanged);
          return qty > 0 ? sum + qty : sum;
        }, 0);

        const shippedQuantity = item.changes.reduce((sum, change) => {
          const qty = Number(change.quantityChanged);
          return qty < 0 ? sum + Math.abs(qty) : sum;
        }, 0);

        const cancellableQuantity = preparedQuantity - shippedQuantity;

        if (cancellableQuantity > 0) {
          // Use base quantity (without conversion) since cancelShip will apply conversion
          cancelInputs.push({
            itemId: item.id,
            quantity: cancellableQuantity / conversionFactor,
          });
        }
      }

      // Cancel all remaining prepared items
      if (cancelInputs.length > 0) {
        await this.cancelShipInternal(cancelInputs, manager);
      }

      // Mark order as removed
      await shipInventoryOrderRepository.update(
        { id },
        { removedAt: new Date() },
      );
      return true;
    });
  }

  /**
   * Internal cancel method that accepts a manager for transaction support
   */
  private async cancelShipInternal(
    options: CancelShipInventoryOrderInput[],
    manager: EntityManager,
  ): Promise<void> {
    const changeRepository =
      manager.getRepository<ShipInventoryOrderChangeEntityClass>(
        ShipInventoryOrderChangeEntityClass,
      );
    const itemRepository =
      manager.getRepository<ShipInventoryOrderItemEntityClass>(
        this.shipInventoryOrderItemEntity,
      );
    const orderRepository = manager.getRepository<OrderEntity>(
      this.entities.order,
    );
    const stockRepository = manager.getRepository<StockEntityClass>(
      this.entities.stock,
    );

    const items = await itemRepository.find({
      where: { id: In(options.map((o) => o.itemId)) },
      relations: { changes: true },
    });
    const itemMap = new Map(items.map((item) => [item.id, item]));
    // Source (material, batch) locks first, in a fixed order, before any
    // batch-group lock a split takes -- the same order every path uses.
    await this.stockService.lockStockSlots(items, manager);

    for (const option of options) {
      await (async () => {
        const item = itemMap.get(option.itemId);
        if (!item) return;

        const conversionFactor = await this.materialService.getConversionFactor(
          item.materialId,
          item.unitId || undefined,
          manager,
        );

        const preparedQuantity = item.changes.reduce((sum, change) => {
          const qty = Number(change.quantityChanged);
          return qty > 0 ? sum + qty : sum;
        }, 0);

        const shippedQuantity = item.changes.reduce((sum, change) => {
          const qty = Number(change.quantityChanged);
          return qty < 0 ? sum + Math.abs(qty) : sum;
        }, 0);

        const cancellableQuantity = preparedQuantity - shippedQuantity;

        const cancelQuantity =
          option.quantity != null
            ? option.quantity * conversionFactor
            : cancellableQuantity;

        if (cancellableQuantity - cancelQuantity < 0) {
          throw new Error(
            `Cancel quantity exceeds prepared quantity for item ${option.itemId}`,
          );
        }

        if (cancelQuantity <= 0) return;

        const inShipmentBatch = await this.batchService.splitBatch({
          id: item.batchId,
          inShipment: true,
          manager,
        });

        const reverseOrder = await orderRepository.save(
          orderRepository.create(),
        );

        await this.stockService.validateStockAvailability(
          {
            materialId: item.materialId,
            batchId: inShipmentBatch.id,
            locationId: this.stockService.resolveLocationId(item.locationId),
            loaderId: this.stockService.resolveLoaderId(item.loaderId),
            quantity: cancelQuantity,
          },
          manager,
        );

        await Promise.all([
          changeRepository.save(
            changeRepository.create({
              itemId: option.itemId,
              id: reverseOrder.id,
              quantityChanged: -1 * cancelQuantity,
            }),
          ),
          stockRepository.save(
            stockRepository.create([
              {
                orderId: reverseOrder.id,
                materialId: item.materialId,
                batchId: item.batchId,
                locationId: this.stockService.resolveLocationId(
                  item.locationId,
                ),
                loaderId: this.stockService.resolveLoaderId(item.loaderId),
                quantity: cancelQuantity,
              } as DeepPartial<StockEntityClass>,
              {
                orderId: reverseOrder.id,
                materialId: item.materialId,
                batchId: inShipmentBatch.id,
                locationId: this.stockService.resolveLocationId(
                  item.locationId,
                ),
                loaderId: this.stockService.resolveLoaderId(item.loaderId),
                quantity: -1 * cancelQuantity,
              } as DeepPartial<StockEntityClass>,
            ]),
          ),
        ]);
      })();
    }
  }

  async findMany(
    options: FindShipInventoryOrderInput<T>,
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
          SELECT 1 FROM ${quotedTablePathOf(this.dataSource, this.shipInventoryOrderItemEntity)} si_items
          INNER JOIN ${quotedTablePathOf(this.dataSource, this.entities.material)} si_mat ON si_mat.id = si_items."materialId"
          WHERE si_items."orderId" = orders.id
          AND si_mat.key ILIKE :materialKey
        )`,
        { materialKey: `%${options.materialKey}%` },
      );

    if (options.batchKey)
      queryBuilder.andWhere(
        `EXISTS (
          SELECT 1 FROM ${quotedTablePathOf(this.dataSource, this.shipInventoryOrderItemEntity)} si_items
          INNER JOIN ${quotedTablePathOf(this.dataSource, this.entities.batch)} si_batch ON si_batch.id = si_items."batchId"
          WHERE si_items."orderId" = orders.id
          AND si_batch.key ILIKE :batchKey
        )`,
        { batchKey: `%${options.batchKey}%` },
      );

    if (options.locationKey)
      queryBuilder.andWhere(
        `EXISTS (
          SELECT 1 FROM ${quotedTablePathOf(this.dataSource, this.shipInventoryOrderItemEntity)} si_items
          INNER JOIN ${quotedTablePathOf(this.dataSource, this.entities.location)} si_loc ON si_loc.id = si_items."locationId"
          WHERE si_items."orderId" = orders.id
          AND si_loc.key ILIKE :locationKey
        )`,
        { locationKey: `%${options.locationKey}%` },
      );

    if (options.loaderKey)
      queryBuilder.andWhere(
        `EXISTS (
          SELECT 1 FROM ${quotedTablePathOf(this.dataSource, this.shipInventoryOrderItemEntity)} si_items
          INNER JOIN ${quotedTablePathOf(this.dataSource, LoadersEntityClass)} si_ldr ON si_ldr.id = si_items."loaderId"
          WHERE si_items."orderId" = orders.id
          AND si_ldr."serialId" ILIKE :loaderKey
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

    // Raw query with a join (see ReceiveInventoryOrderService.findMany):
    // `skip`/`take` would be dropped silently, `offset`/`limit` are honoured.
    // `order_status` is one row per order, so the page size is exact.
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

  async addShipInventoryOrderItems(
    options: CreateShipInventoryOrderItemsInput,
    outerManager?: EntityManager,
  ): Promise<T> {
    return runInTransaction(this.dataSource, outerManager, async (manager) => {
      const shipInventoryOrderRepository =
        manager.getRepository<ShipInventoryOrderEntityClass>(
          this.shipInventoryOrderEntity,
        );

      const order = await shipInventoryOrderRepository.findOneByOrFail({
        id: options.orderId,
        removedAt: IsNull(),
      });

      if (options.items.length) {
        const items = options.items.map((item) => ({
          ...item,
          orderId: options.orderId,
        }));
        await this.processShipInventoryOrderItems(items, manager);
      }

      return order as T;
    });
  }

  ship(
    options: ShipInventoryOrderInput[] | ShipInventoryOrderInput,
    outerManager?: EntityManager,
  ): Promise<boolean> {
    if (!Array.isArray(options)) options = [options];
    return runInTransaction(this.dataSource, outerManager, async (manager) => {
      const changeRepository =
        manager.getRepository<ShipInventoryOrderChangeEntityClass>(
          ShipInventoryOrderChangeEntityClass,
        );
      const itemRepository =
        manager.getRepository<ShipInventoryOrderItemEntityClass>(
          this.shipInventoryOrderItemEntity,
        );

      const orderRepository = manager.getRepository<OrderEntity>(
        this.entities.order,
      );
      const stockRepository = manager.getRepository<StockEntityClass>(
        this.entities.stock,
      );

      const items = await itemRepository.find({
        where: { id: In(options.map((option) => option.itemId)) },
        relations: { changes: true },
      });
      const itemMap = new Map(items.map((item) => [item.id, item]));
      // Source (material, batch) locks first, in a fixed order, before any
      // batch-group lock a split takes -- the same order every path uses.
      await this.stockService.lockStockSlots(items, manager);
      for (const option of options) {
        await (async () => {
          const item = itemMap.get(option.itemId);
          if (!item) return;

          const conversionFactor =
            await this.materialService.getConversionFactor(
              item.materialId,
              item.unitId || undefined,
              manager,
            );

          const totalShipped = item.changes.reduce((sum, change) => {
            const qty = Number(change.quantityChanged);
            return qty < 0 ? sum + Math.abs(qty) : sum;
          }, 0);

          const remainingQuantity =
            conversionFactor * item.targetShippedQuantity - totalShipped;

          if (remainingQuantity - option.quantity * conversionFactor < 0) {
            throw new Error(
              `Shipping quantity exceeds target for item ${option.itemId}`,
            );
          }

          // Create splitted batch for ship completion
          const shippedBatch = await this.batchService.splitBatch({
            id: item.batchId,
            inShipment: true,
            manager,
          });

          const newOrder = await orderRepository.save(orderRepository.create());

          await this.stockService.validateStockAvailability(
            {
              materialId: item.materialId,
              batchId: item.batchId,
              locationId: this.stockService.resolveLocationId(item.locationId),
              loaderId: this.stockService.resolveLoaderId(item.loaderId),
              quantity: option.quantity * conversionFactor,
            },
            manager,
          );

          await Promise.all([
            changeRepository.save(
              changeRepository.create({
                itemId: option.itemId,
                quantityChanged: -1 * option.quantity * conversionFactor,
                id: newOrder.id,
              }),
            ),
            stockRepository.save(
              stockRepository.create([
                {
                  batchId: shippedBatch.id,
                  materialId: item.materialId,
                  locationId: this.stockService.resolveLocationId(
                    item.locationId,
                  ),
                  loaderId: this.stockService.resolveLoaderId(item.loaderId),
                  quantity: -1 * option.quantity * conversionFactor,
                  orderId: newOrder.id,
                } as DeepPartial<StockEntityClass>,
              ]),
            ),
          ]);
        })();
      }

      return true;
    });
  }

  /**
   * Cancel prepared ship inventory order items
   * Reverses the prepare step by moving stock from IN_SHIPMENT back to FREE
   * Can only cancel prepared quantity that hasn't been shipped yet
   * If quantity is not provided, cancels all remaining cancellable quantity
   */
  cancelShip(
    options: CancelShipInventoryOrderInput[] | CancelShipInventoryOrderInput,
    outerManager?: EntityManager,
  ): Promise<boolean> {
    if (!Array.isArray(options)) options = [options];

    return runInTransaction(this.dataSource, outerManager, async (manager) => {
      await this.cancelShipInternal(options, manager);
      return true;
    });
  }
}
