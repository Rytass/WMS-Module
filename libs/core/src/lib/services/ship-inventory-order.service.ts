import { Inject, Injectable } from '@nestjs/common';
import {
  ShipInventoryOrderEntity,
  ShipInventoryOrderEntityClass,
} from '../models/extensions/ship-inventory-order.entity';
import {
  ShipInventoryOrderItemEntity,
  ShipInventoryOrderItemEntityClass,
} from '../models/extensions/ship-inventory-order-item.entity';
import { DataSource, EntityManager, In, type EntityTarget } from 'typeorm';
import {
  CreateShipInventoryOrderInput,
  UpdateShipInventoryOrderInput,
} from '../typings/create-ship-inventory-order.input';
import {
  FindShipInventoryOrderInput,
  ShipInventoryOrderStatus,
} from '../typings/find-ship-inventory-order.input';
import { OrderEntity } from '@rytass/wms-base-nestjs-module';

@Injectable()
export class ShipInventoryOrderService<
  T extends ShipInventoryOrderEntityClass = ShipInventoryOrderEntityClass,
  K extends ShipInventoryOrderItemEntityClass = ShipInventoryOrderItemEntityClass
> {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(ShipInventoryOrderEntity)
    readonly shipInventoryOrderEntity: EntityTarget<T>,
    @Inject(ShipInventoryOrderItemEntity)
    readonly shipInventoryOrderItemEntity: EntityTarget<K>
  ) {}

  async createShipInventoryOrder({
    manager = this.dataSource.manager,
    ...options
  }: CreateShipInventoryOrderInput & { manager?: EntityManager }): Promise<T> {
    const orderRepository = manager.getRepository<OrderEntity>(OrderEntity);
    const shipInventoryOrderRepository =
      manager.getRepository<ShipInventoryOrderEntityClass>(
        this.shipInventoryOrderEntity
      );
    const shipInventoryOrderItemRepository =
      manager.getRepository<ShipInventoryOrderItemEntityClass>(
        this.shipInventoryOrderItemEntity
      );

    // create base order
    await orderRepository.save(orderRepository.create({ id: options.id }));

    // create ship inventory order
    const order = await shipInventoryOrderRepository.save(
      shipInventoryOrderRepository.create(options)
    );

    // create ship inventory order items
    if (options.items && options.items.length > 0) {
      const items = shipInventoryOrderItemRepository.create(
        options.items.map((item) => ({
          ...item,
          orderId: order.id,
        }))
      );
      await shipInventoryOrderItemRepository.save(items);
    }

    return order as T;
  }

  async updateShipInventoryOrder({
    id,
    manager = this.dataSource.manager,
    ...options
  }: UpdateShipInventoryOrderInput & { manager?: EntityManager }): Promise<T> {
    const shipInventoryOrderRepository =
      manager.getRepository<ShipInventoryOrderEntityClass>(
        this.shipInventoryOrderEntity
      );
    const shipInventoryOrderItemRepository =
      manager.getRepository<ShipInventoryOrderItemEntityClass>(
        this.shipInventoryOrderItemEntity
      );

    const order = await shipInventoryOrderRepository.findOneByOrFail({ id });
    const updated = await shipInventoryOrderRepository.save(
      shipInventoryOrderRepository.create({
        ...order,
        ...options,
      })
    );

    if (options.items?.length) {
      const newItems: Partial<ShipInventoryOrderItemEntityClass>[] = [];
      const existingItems: Partial<ShipInventoryOrderItemEntityClass>[] = [];
      const removeItems: Partial<ShipInventoryOrderItemEntityClass>[] = [];

      await shipInventoryOrderItemRepository
        .find({ where: { orderId: id } })
        .then((items) => {
          const itemSet = new Set(items!.map((i) => i.id));
          options.items?.forEach((item) => {
            if (!item.id) newItems.push(item);
            else if (itemSet.has(item.id)) existingItems.push(item);
            else removeItems.push(item);
          });
        });

      if (newItems.length)
        await shipInventoryOrderItemRepository.save(
          shipInventoryOrderItemRepository.create(
            newItems.map((item) => ({ ...item, orderId: id }))
          )
        );
      if (existingItems.length)
        await Promise.all(
          existingItems.map(async (item) =>
            shipInventoryOrderItemRepository.update({ id: item.id }, item)
          )
        );

      if (removeItems.length)
        await shipInventoryOrderItemRepository.delete({
          id: In(removeItems.map((item) => item.id!)),
        });
    }

    return updated as T;
  }

  findMany(options: FindShipInventoryOrderInput): Promise<[T[], number]> {
    const queryBuilder = this.dataSource
      .getRepository<T>(this.shipInventoryOrderEntity)
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
        case ShipInventoryOrderStatus.REMOVED:
          queryBuilder.andWhere('order."removedAt" IS NOT NULL');
          break;

        case ShipInventoryOrderStatus.SHIPPED:
          queryBuilder.innerJoin(
            (qb) =>
              qb
                .from(ShipInventoryOrderItemEntityClass, 'item')
                .select('item."orderId"', 'orderId')
                .addSelect(
                  'SUM(item."targetShippedQuantity")',
                  'totalTargetShippedQuantity'
                )
                .addSelect(
                  'SUM(item."actualShippedQuantity")',
                  'totalActualShippedQuantity'
                )
                .groupBy('item."orderId"'),
            'summary',
            'summary."orderId" = order.id AND summary."totalTargetShippedQuantity" = summary."totalActualShippedQuantity"'
          );
          break;

        case ShipInventoryOrderStatus.PARTIAL_SHIPPED:
          queryBuilder.innerJoin(
            (qb) =>
              qb
                .from(ShipInventoryOrderItemEntityClass, 'item')
                .addSelect('item."orderId"', 'orderId')
                .addSelect(
                  'SUM(item."targetShippedQuantity")',
                  'totalTargetShippedQuantity'
                )
                .addSelect(
                  'SUM(item."actualShippedQuantity")',
                  'totalActualShippedQuantity'
                )
                .groupBy('item."orderId"'),
            'summary',
            'summary."orderId" = order.id AND summary."totalActualShippedQuantity" > 0 AND summary."totalActualShippedQuantity" < summary."totalTargetShippedQuantity"'
          );

          break;

        case ShipInventoryOrderStatus.PARTIAL_SHIPPED:
          queryBuilder.innerJoin(
            (qb) =>
              qb
                .from(ShipInventoryOrderItemEntityClass, 'item')
                .addSelect('item."orderId"', 'orderId')
                .addSelect(
                  'SUM(item."actualShippedQuantity")',
                  'totalActualShippedQuantity'
                )
                .groupBy('item."orderId"'),
            'summary',
            'summary."orderId" = order.id AND summary."totalActualShippedQuantity" = 0'
          );

          break;
      }
    }

    return queryBuilder.getManyAndCount();
  }
}
