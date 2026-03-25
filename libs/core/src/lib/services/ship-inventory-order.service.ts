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
import {
  OrderEntity,
  StockEntity,
  BatchEntity,
} from '@rytass/wms-base-nestjs-module';
import {
  ShipInventoryOrderChangeEntityClass,
  ShipInventoryOrderReferenceEntity,
  ShipInventoryOrderReferenceEntityClass,
  MaterialEntityClass,
  StockEntityClass,
  SaleOrderEntity,
  SaleOrderEntityClass,
} from '../models';
import { ShipInventoryOrderInput } from '../typings/ship-inventory-order.input';
import { MaterialService } from './material.service';
import { BatchService } from './batch.service';
import { CreateShipInventoryOrderReferenceInput } from '../typings/create-ship-inventory-order.input';

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
    private readonly materialService: MaterialService,
    private readonly batchService: BatchService,
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
                  WHEN COALESCE((
                    SELECT SUM(CAST(c."quantityChanged" AS NUMERIC))
                    FROM ship_inventory_order_changes c
                    JOIN ship_inventory_order_items i ON c."itemId" = i.id
                    WHERE i."orderId" = o.id
                  ), 0) = COALESCE(target_sum."targetSum", 0) AND COALESCE(target_sum."targetSum", 0) > 0 THEN '${ShipInventoryOrderStatus.SHIPPED}'
                  WHEN COALESCE((
                    SELECT SUM(CAST(c."quantityChanged" AS NUMERIC))
                    FROM ship_inventory_order_changes c
                    JOIN ship_inventory_order_items i ON c."itemId" = i.id
                    WHERE i."orderId" = o.id
                  ), 0) > 0 AND COALESCE((
                    SELECT SUM(CAST(c."quantityChanged" AS NUMERIC))
                    FROM ship_inventory_order_changes c
                    JOIN ship_inventory_order_items i ON c."itemId" = i.id
                    WHERE i."orderId" = o.id
                  ), 0) < COALESCE(target_sum."targetSum", 0) THEN '${ShipInventoryOrderStatus.PARTIAL_SHIPPED}'
                  ELSE '${ShipInventoryOrderStatus.PENDING}'
                END`,
                'status',
              )
              .addSelect('o.id', 'orderId')
              .from('ship_inventory_orders', 'o')
              .leftJoin(
                (sumQuery) =>
                  sumQuery
                    .select('i."orderId"', 'orderId')
                    .addSelect(
                      'SUM(CAST(i."targetShippedQuantity" AS NUMERIC))',
                      'targetSum',
                    )
                    .from('ship_inventory_order_items', 'i')
                    .groupBy('i."orderId"'),
                'target_sum',
                'target_sum."orderId" = o.id',
              ),
          'order_status',
          `${alias}.id = order_status."orderId"`,
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
    const materialRepository =
      manager.getRepository<MaterialEntityClass>(MaterialEntityClass);
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
    const orderRepository = manager.getRepository<OrderEntity>(OrderEntity);
    const stockRepository =
      manager.getRepository<StockEntityClass>(StockEntityClass);

    await Promise.all(
      items.map(async (data) => {
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
        );

        await shipInventoryOrderChangeRepository.save(
          shipInventoryOrderChangeRepository.create({
            itemId: item.id,
            id: base.id,
            quantityChanged: item.targetShippedQuantity * conversionFactor,
          }),
        );

        // Stock movements track the shipment through splitted batch
        await stockRepository.save(
          stockRepository.create([
            // deduct from original batch available stock
            {
              orderId: base.id,
              materialId: item.materialId,
              batchId: item.batchId, // original batch
              locationId: item.locationId || undefined,
              loaderId: item.loaderId || undefined,
              quantity: -1 * item.targetShippedQuantity * conversionFactor,
            } as DeepPartial<StockEntityClass>,
            // add to splitted batch in shipment state
            {
              orderId: base.id,
              materialId: item.materialId,
              batchId: splittedBatch.id, // splitted batch marked inShipment
              locationId: item.locationId || undefined,
              loaderId: item.loaderId || undefined,
              quantity: item.targetShippedQuantity * conversionFactor,
            } as DeepPartial<StockEntityClass>,
          ]),
        );
      }),
    );
  }

  async createShipInventoryOrder({
    manager = this.dataSource.manager,
    ...options
  }: CreateShipInventoryOrderInput & { manager?: EntityManager }): Promise<T> {
    const orderRepository = manager.getRepository<OrderEntity>(OrderEntity);
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
  }

  /**
   * Update a ship inventory order and its items
   * update existing item when id is provided, otherwise create new item, remove behaviour controlled by removedAt field
   */
  async updateShipInventoryOrder({
    id,
    manager = this.dataSource.manager,
    ...options
  }: UpdateShipInventoryOrderInput & { manager?: EntityManager }): Promise<T> {
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
    const materialRepository =
      manager.getRepository<MaterialEntityClass>(MaterialEntityClass);

    const order = await shipInventoryOrderRepository.findOneByOrFail({
      id,
      removedAt: IsNull(),
    });
    const updated = await shipInventoryOrderRepository.save(
      shipInventoryOrderRepository.create({
        ...order,
        ...options,
      }),
    );

    if (options.references?.length) {
      const newItems: Partial<ShipInventoryOrderReferenceEntityClass>[] = [];
      const existingItems: Partial<ShipInventoryOrderReferenceEntityClass>[] =
        [];

      const items = await shipInventoryOrderReferenceRepository.find({
        where: { orderId: id, removedAt: IsNull() },
      });
      const itemSet = new Set(items.map((i) => i.id));

      const results = await Promise.all(
        (options.references || []).map(async (item) => {
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
          return { item, batch };
        }),
      );

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

    if (options.items?.length) {
      const newItems: Partial<CreateShipInventoryOrderItemInput>[] = [];
      const existingItems: Partial<ShipInventoryOrderItemEntityClass>[] = [];

      await shipInventoryOrderItemRepository
        .find({ where: { orderId: id, removedAt: IsNull() } })
        .then((items) => {
          const itemSet = new Set(items.map((i) => i.id));
          options.items?.forEach((item) => {
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
  }

  async removeShipInventoryOrder(id: string): Promise<boolean> {
    return this.dataSource
      .getRepository<ShipInventoryOrderEntityClass>(
        this.shipInventoryOrderEntity,
      )
      .update({ id }, { removedAt: new Date() })
      .then(({ affected }) => !!affected && affected > 0);
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

    if (options.wildcard) {
      const { key, value } = options.wildcard;
      queryBuilder.andWhere(`orders."${String(key)}" ILIKE :value`, {
        value: `%${value}%`,
      });
    }

    const total = await queryBuilder.getCount();

    if (options.offset !== undefined && options.offset >= 0)
      queryBuilder.skip(options.offset);

    if (options.limit !== undefined && options.limit > 0)
      queryBuilder.take(options.limit);

    const items = await queryBuilder.getRawMany();

    return [items, total];
  }

  async addShipInventoryOrderItems(
    options: CreateShipInventoryOrderItemsInput,
    manager = this.dataSource.manager,
  ): Promise<T> {
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
  }

  ship(
    options: ShipInventoryOrderInput[] | ShipInventoryOrderInput,
  ): Promise<boolean> {
    if (!Array.isArray(options)) options = [options];
    return this.dataSource.transaction(async (manager) => {
      const changeRepository =
        manager.getRepository<ShipInventoryOrderChangeEntityClass>(
          ShipInventoryOrderChangeEntityClass,
        );
      const itemRepository =
        manager.getRepository<ShipInventoryOrderItemEntityClass>(
          this.shipInventoryOrderItemEntity,
        );

      const orderRepository = manager.getRepository<OrderEntity>(OrderEntity);
      const stockRepository = manager.getRepository<StockEntity>(StockEntity);

      const items = await itemRepository.find({
        where: { id: In(options.map((option) => option.itemId)) },
        relations: ['changes'],
      });
      const itemMap = new Map(items.map((item) => [item.id, item]));
      await Promise.all(
        options.map(async (option) => {
          const item = itemMap.get(option.itemId);
          if (!item) return;

          const conversionFactor =
            await this.materialService.getConversionFactor(
              item.materialId,
              item.unitId || undefined,
            );

          const totalChanged = item.changes.reduce(
            (sum, change) => sum + Number(change.quantityChanged),
            0,
          );

          const remainingQuantity =
            conversionFactor * item.targetShippedQuantity - totalChanged;

          if (remainingQuantity - option.quantity * conversionFactor < 0) {
            throw new Error(
              `Shipping quantity exceeds target for item ${option.itemId}`,
            );
          }

          // Create splitted batch for ship completion
          const shippedBatch = await this.batchService.splitBatch({
            id: item.batchId,
            manager,
          });

          const newOrder = await orderRepository.save(orderRepository.create());

          await Promise.all([
            changeRepository.save(
              changeRepository.create({
                itemId: option.itemId,
                quantityChanged: option.quantity * conversionFactor,
                id: newOrder.id,
              }),
            ),
            stockRepository.save(
              stockRepository.create([
                // add to destination with original batch reference
                {
                  batchId: item.batchId,
                  materialId: item.materialId,
                  quantity: option.quantity * conversionFactor,
                  orderId: newOrder.id,
                } as DeepPartial<StockEntityClass>,
                // deduct from shipped splitted batch
                {
                  batchId: shippedBatch.id,
                  materialId: item.materialId,
                  quantity: -1 * option.quantity * conversionFactor,
                  orderId: newOrder.id,
                } as DeepPartial<StockEntityClass>,
              ]),
            ),
          ]);
        }),
      );

      return true;
    });
  }
}
