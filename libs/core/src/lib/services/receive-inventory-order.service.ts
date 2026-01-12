import { Inject, Injectable } from '@nestjs/common';
import {
  ReceiveInventoryOrderEntity,
  ReceiveInventoryOrderEntityClass,
} from '../models/extensions/receive-inventory-order.entity';
import {
  ReceiveInventoryOrderItemEntity,
  ReceiveInventoryOrderItemEntityClass,
} from '../models/extensions/receive-inventory-order-item.entity';
import {
  DataSource,
  EntityManager,
  IsNull,
  Repository,
  type EntityTarget,
} from 'typeorm';
import {
  CreateReceiveInventoryOrderInput,
  UpdateReceiveInventoryOrderInput,
} from '../typings/create-receive-inventory-order.input';
import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import {
  FindReceiveInventoryOrderInput,
  ReceiveInventoryOrderStatus,
} from '../typings/find-receive-inventory-order.input';

/**
 * Service for managing receive inventory orders and their items
 * Supports dynamic entity injection for customization
 * T - Receive Inventory Order entity type
 * K - Receive Inventory Order Item entity type
 */
@Injectable()
export class ReceiveInventoryOrderService<
  T extends ReceiveInventoryOrderEntityClass = ReceiveInventoryOrderEntityClass,
  K extends ReceiveInventoryOrderItemEntityClass = ReceiveInventoryOrderItemEntityClass
> {
  readonly receiveInventoryOrderRepository: Repository<T>;
  constructor(
    private readonly dataSource: DataSource,
    @Inject(ReceiveInventoryOrderEntity)
    readonly receiveInventoryOrderEntity: EntityTarget<T>,
    @Inject(ReceiveInventoryOrderItemEntity)
    readonly receiveInventoryOrderItemEntity: EntityTarget<K>
  ) {
    this.receiveInventoryOrderRepository = this.dataSource.getRepository<T>(
      this.receiveInventoryOrderEntity
    );
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
        this.receiveInventoryOrderEntity
      );
    const receiveInventoryOrderItemRepository =
      manager.getRepository<ReceiveInventoryOrderItemEntityClass>(
        this.receiveInventoryOrderItemEntity
      );

    // create base order
    await orderRepository.save(orderRepository.create({ id: options.id }));

    // create receive inventory order
    const order = await receiveInventoryOrderRepository.save(
      receiveInventoryOrderRepository.create(options)
    );

    // create receive inventory order items
    if (options.items && options.items.length > 0) {
      const items = receiveInventoryOrderItemRepository.create(
        options.items.map((item) => ({
          ...item,
          orderId: order.id,
        }))
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
        this.receiveInventoryOrderEntity
      );
    const receiveInventoryOrderItemRepository =
      manager.getRepository<ReceiveInventoryOrderItemEntityClass>(
        this.receiveInventoryOrderItemEntity
      );

    const order = await receiveInventoryOrderRepository.findOneByOrFail({
      id,
      removedAt: IsNull(),
    });
    const updated = await receiveInventoryOrderRepository.save(
      receiveInventoryOrderRepository.create({
        ...order,
        ...options,
      })
    );

    if (options.items?.length) {
      const newItems: Partial<ReceiveInventoryOrderItemEntityClass>[] = [];
      const existingItems: Partial<ReceiveInventoryOrderItemEntityClass>[] = [];

      await receiveInventoryOrderItemRepository
        .find({ where: { orderId: id } })
        .then((items) => {
          const itemSet = new Set(items!.map((i) => i.id));
          options.items?.forEach((item) => {
            if (item.removedAt) return;

            if (!item.id) newItems.push(item);
            else if (itemSet.has(item.id)) existingItems.push(item);
          });
        });

      if (newItems.length)
        await receiveInventoryOrderItemRepository.save(
          receiveInventoryOrderItemRepository.create(
            newItems.map((item) => ({ ...item, orderId: id }))
          )
        );
      if (existingItems.length)
        await Promise.all(
          existingItems.map(async (item) =>
            receiveInventoryOrderItemRepository.update({ id: item.id }, item)
          )
        );
    }

    return updated as T;
  }

  async removeReceiveInventoryOrder(id: string): Promise<boolean> {
    return this.dataSource
      .getRepository<ReceiveInventoryOrderEntityClass>(
        this.receiveInventoryOrderEntity
      )
      .update({ id }, { removedAt: new Date() })
      .then(({ affected }) => !!affected && affected > 0);
  }

  findMany(options: FindReceiveInventoryOrderInput): Promise<[T[], number]> {
    const queryBuilder = this.dataSource
      .getRepository<T>(this.receiveInventoryOrderEntity)
      .createQueryBuilder('order');

    if (options.id) queryBuilder.andWhere('order.id = :id', { id: options.id });

    if (options.createdBy)
      queryBuilder.andWhere('order."createdBy" ILIKE :createdBy', {
        createdBy: `%${options.createdBy}%`,
      });

    if (options.description)
      queryBuilder.andWhere('order.description ILIKE :description', {
        description: `%${options.description}%`,
      });

    if (options.dateRange)
      queryBuilder.andWhere('order."createdAt" BETWEEN :from AND :to', {
        from: options.dateRange.from,
        to: options.dateRange.to,
      });

    if (options.status) {
      switch (options.status) {
        case ReceiveInventoryOrderStatus.REMOVED:
          queryBuilder.andWhere('order."removedAt" IS NOT NULL');
          break;

        case ReceiveInventoryOrderStatus.RECEIVED:
          queryBuilder.innerJoin(
            (qb) =>
              qb
                .from(ReceiveInventoryOrderItemEntityClass, 'item')
                .select('item."orderId"', 'orderId')
                .addSelect(
                  'SUM(item."targetReceivedQuantity")',
                  'totalTargetReceivedQuantity'
                )
                .addSelect(
                  'SUM(item."actualReceivedQuantity")',
                  'totalActualReceivedQuantity'
                )
                .groupBy('item."orderId"'),
            'summary',
            'summary."orderId" = order.id AND summary."totalTargetReceivedQuantity" = summary."totalActualReceivedQuantity"'
          );
          break;

        case ReceiveInventoryOrderStatus.PARTIAL_RECEIVED:
          queryBuilder.innerJoin(
            (qb) =>
              qb
                .from(ReceiveInventoryOrderItemEntityClass, 'item')
                .addSelect('item."orderId"', 'orderId')
                .addSelect(
                  'SUM(item."targetReceivedQuantity")',
                  'totalTargetReceivedQuantity'
                )
                .addSelect(
                  'SUM(item."actualReceivedQuantity")',
                  'totalActualReceivedQuantity'
                )
                .groupBy('item."orderId"'),
            'summary',
            'summary."orderId" = order.id AND summary."totalActualReceivedQuantity" > 0 AND summary."totalActualReceivedQuantity" < summary."totalTargetReceivedQuantity"'
          );

          break;

        case ReceiveInventoryOrderStatus.PARTIAL_RECEIVED:
          queryBuilder.innerJoin(
            (qb) =>
              qb
                .from(ReceiveInventoryOrderItemEntityClass, 'item')
                .addSelect('item."orderId"', 'orderId')
                .addSelect(
                  'SUM(item."actualReceivedQuantity")',
                  'totalActualReceivedQuantity'
                )
                .groupBy('item."orderId"'),
            'summary',
            'summary."orderId" = order.id AND summary."totalActualReceivedQuantity" = 0'
          );

          break;
      }
    }

    if (options.offset !== undefined && options.offset >= 0)
      queryBuilder.skip(options.offset);

    if (options.limit !== undefined && options.limit > 0)
      queryBuilder.take(options.limit);

    return queryBuilder.getManyAndCount();
  }
}
