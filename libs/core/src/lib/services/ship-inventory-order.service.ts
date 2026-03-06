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
  EntityManager,
  In,
  IsNull,
  SelectQueryBuilder,
  type EntityTarget,
} from 'typeorm';
import {
  CreateShipInventoryOrderInput,
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
} from '../models';
import { ShipInventoryOrderInput } from '../typings/ship-inventory-order.input';
import { MaterialService } from './material.service';
import { CreateShipInventoryOrderReferenceInput } from '../typings/create-ship-inventory-order.input';
import { DeepPartial } from 'typeorm';

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
    @Inject(ShipInventoryOrderEntity)
    readonly shipInventoryOrderEntity: EntityTarget<T>,
    @Inject(ShipInventoryOrderItemEntity)
    readonly shipInventoryOrderItemEntity: EntityTarget<K>,
    @Inject(ShipInventoryOrderReferenceEntity)
    readonly shipInventoryOrderReferenceEntity: EntityTarget<ShipInventoryOrderReferenceEntityClass>,
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
    const batchRepository = manager.getRepository<BatchEntity>(BatchEntity);

    return references.reduce(
      async (accPromise, reference) => {
        const acc = await accPromise;

        try {
          const material = await materialRepository.findOneBy({
            key: reference.materialKey,
          });
          if (!material) return acc;

          let batch: BatchEntity | null = null;
          if (reference.batchKey) {
            batch = await batchRepository.findOneBy({
              key: reference.batchKey,
              materialId: material.id,
            });
          }

          return [
            ...acc,
            {
              ...reference,
              materialId: material.id,
              batchId: batch?.id || null,
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
      const newItems: Partial<CreateShipInventoryOrderReferenceInput>[] = [];
      const existingItems: Partial<ShipInventoryOrderReferenceEntityClass>[] =
        [];

      await shipInventoryOrderReferenceRepository
        .find({ where: { orderId: id } })
        .then((items) => {
          const itemSet = new Set(items.map((i) => i.id));
          options.references?.forEach((item) => {
            if (item.removedAt) return;

            if (!item.id) newItems.push(item);
            else if (itemSet.has(item.id)) existingItems.push(item);
          });
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
        await Promise.all(
          existingItems.map(async (item) =>
            shipInventoryOrderReferenceRepository.update({ id: item.id }, item),
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

  async findMany(options: FindShipInventoryOrderInput): Promise<[T[], number]> {
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

    const total = await queryBuilder.getCount();

    if (options.offset !== undefined && options.offset >= 0)
      queryBuilder.skip(options.offset);

    if (options.limit !== undefined && options.limit > 0)
      queryBuilder.take(options.limit);

    const items = await queryBuilder.getRawMany();

    return [items, total];
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
              stockRepository.create({
                batchId: item.batchId,
                materialId: item.materialId,
                quantity: option.quantity * conversionFactor,
                orderId: newOrder.id,
              }),
            ),
          ]);
        }),
      );

      return true;
    });
  }
}
