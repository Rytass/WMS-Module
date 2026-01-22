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
  EntityManager,
  In,
  IsNull,
  SelectQueryBuilder,
  type EntityTarget,
} from 'typeorm';
import {
  CreateReceiveInventoryOrderInput,
  UpdateReceiveInventoryOrderInput,
} from '../typings/create-receive-inventory-order.input';
import { OrderEntity, StockEntity } from '@rytass/wms-base-nestjs-module';
import {
  FindReceiveInventoryOrderInput,
  ReceiveInventoryOrderStatus,
} from '../typings/find-receive-inventory-order.input';
import { ReceiveInventoryOrderChangeEntityClass } from '../models';
import { ReceiveInventoryOrderInput } from '../typings/receive-inventory-order.input';

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
    @Inject(ReceiveInventoryOrderEntity)
    readonly receiveInventoryOrderEntity: EntityTarget<T>,
    @Inject(ReceiveInventoryOrderItemEntity)
    readonly receiveInventoryOrderItemEntity: EntityTarget<K>,
  ) {
    this.selectQueryBuilder = (alias: string) => {
      return this.dataSource
        .getRepository<T>(this.receiveInventoryOrderEntity)
        .createQueryBuilder(alias)
        .leftJoin(
          (subQuery) =>
            subQuery
              .select(
                `CASE
                  WHEN o."removedAt" IS NOT NULL THEN '${ReceiveInventoryOrderStatus.PENDING}'
                  WHEN COALESCE((
                    SELECT SUM(CAST(c."quantityChanged" AS NUMERIC))
                    FROM receive_inventory_order_changes c
                    JOIN receive_inventory_order_items i ON c."itemId" = i.id
                    WHERE i."orderId" = o.id
                  ), 0) = o."targetReceivedQuantity" AND o."targetReceivedQuantity" > 0 THEN '${ReceiveInventoryOrderStatus.RECEIVED}'
                  WHEN COALESCE((
                    SELECT SUM(CAST(c."quantityChanged" AS NUMERIC))
                    FROM receive_inventory_order_changes c
                    JOIN receive_inventory_order_items i ON c."itemId" = i.id
                    WHERE i."orderId" = o.id
                  ), 0) > 0 AND COALESCE((
                    SELECT SUM(CAST(c."quantityChanged" AS NUMERIC))
                    FROM receive_inventory_order_changes c
                    JOIN receive_inventory_order_items i ON c."itemId" = i.id
                    WHERE i."orderId" = o.id
                  ), 0) < o."targetReceivedQuantity" THEN '${ReceiveInventoryOrderStatus.PARTIAL_RECEIVED}'
                  ELSE '${ReceiveInventoryOrderStatus.PENDING}'
                END`,
                'status',
              )
              .addSelect('o.id', 'orderId')
              .from('receive_inventory_orders', 'o'),
          'order_status',
          `${alias}.id = order_status."orderId"`,
        )
        .addSelect('order_status.status', `status`);
    };
  }

  async createReceiveInventoryOrder({
    manager = this.dataSource.manager,
    ...options
  }: CreateReceiveInventoryOrderInput & {
    manager?: EntityManager;
  }): Promise<T> {
    const orderRepository = manager.getRepository<OrderEntity>(OrderEntity);
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
    const order = await receiveInventoryOrderRepository.save(
      receiveInventoryOrderRepository.create({ id, ...options }),
    );

    // create receive inventory order items
    if (options.items && options.items.length > 0) {
      const items = receiveInventoryOrderItemRepository.create(
        options.items.map((item) => ({
          ...item,
          orderId: order.id,
        })),
      );
      await receiveInventoryOrderItemRepository.save(items);
    }

    return order as T;
  }

  /**
   * Update a receive inventory order and its items
   * update existing item when id is provided, otherwise create new item, remove behaviour controlled by removedAt field
   */
  async updateReceiveInventoryOrder({
    id,
    manager = this.dataSource.manager,
    ...options
  }: UpdateReceiveInventoryOrderInput & {
    manager?: EntityManager;
  }): Promise<T> {
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
    const updated = await receiveInventoryOrderRepository.save(
      receiveInventoryOrderRepository.create({
        ...order,
        ...options,
      }),
    );

    if (options.items?.length) {
      const newItems: Partial<ReceiveInventoryOrderItemEntityClass>[] = [];
      const existingItems: Partial<ReceiveInventoryOrderItemEntityClass>[] = [];

      await receiveInventoryOrderItemRepository
        .find({ where: { orderId: id } })
        .then((items) => {
          const itemSet = new Set(items.map((i) => i.id));
          options.items?.forEach((item) => {
            if (item.removedAt) return;

            if (!item.id) newItems.push(item);
            else if (itemSet.has(item.id)) existingItems.push(item);
          });
        });

      if (newItems.length)
        await receiveInventoryOrderItemRepository.save(
          receiveInventoryOrderItemRepository.create(
            newItems.map((item) => ({ ...item, orderId: id })),
          ),
        );
      if (existingItems.length)
        await Promise.all(
          existingItems.map(async (item) =>
            receiveInventoryOrderItemRepository.update({ id: item.id }, item),
          ),
        );
    }

    return updated as T;
  }

  async removeReceiveInventoryOrder(id: string): Promise<boolean> {
    return this.dataSource
      .getRepository<ReceiveInventoryOrderEntityClass>(
        this.receiveInventoryOrderEntity,
      )
      .update({ id }, { removedAt: new Date() })
      .then(({ affected }) => !!affected && affected > 0);
  }

  findMany(options: FindReceiveInventoryOrderInput): Promise<[T[], number]> {
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

    if (options.offset !== undefined && options.offset >= 0)
      queryBuilder.skip(options.offset);

    if (options.limit !== undefined && options.limit > 0)
      queryBuilder.take(options.limit);

    return queryBuilder.getManyAndCount();
  }

  receive(
    options: ReceiveInventoryOrderInput[] | ReceiveInventoryOrderInput,
  ): Promise<boolean> {
    if (!Array.isArray(options)) options = [options];

    return this.dataSource.transaction(async (manager) => {
      const changeRepository =
        manager.getRepository<ReceiveInventoryOrderChangeEntityClass>(
          ReceiveInventoryOrderChangeEntityClass,
        );
      const itemRepository =
        manager.getRepository<ReceiveInventoryOrderItemEntityClass>(
          this.receiveInventoryOrderItemEntity,
        );
      const orderRepository = manager.getRepository<OrderEntity>(OrderEntity);
      const stockRepository = manager.getRepository<StockEntity>(StockEntity);

      const items = await itemRepository.find({
        where: { id: In(options.map((o) => o.itemId)) },
        relations: ['changes'],
      });
      const itemMap = new Map(items.map((i) => [i.id, i]));

      await Promise.all(
        options.map(async (option) => {
          const item = itemMap.get(option.itemId);
          if (!item) return;

          const totalChanged = item.changes.reduce(
            (sum, change) => sum + Number(change.quantityChanged),
            0,
          );

          if (totalChanged + option.quantity > item.targetReceivedQuantity) {
            throw new Error(
              `Receiving quantity exceeds target for item ${option.itemId}`,
            );
          }

          const newOrder = await orderRepository.save(orderRepository.create());

          await Promise.all([
            changeRepository.save(
              changeRepository.create({
                itemId: option.itemId,
                quantityChanged: option.quantity,
                id: newOrder.id,
              }),
            ),
            stockRepository.save(
              stockRepository.create({
                batchId: option.batchId ?? item.batchId,
                materialId: item.materialId,
                quantity: option.quantity,
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
