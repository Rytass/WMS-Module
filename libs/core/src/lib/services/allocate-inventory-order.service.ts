import { Inject, Injectable } from '@nestjs/common';
import {
  AllocateInventoryOrderChangeEntityClass,
  AllocateInventoryOrderEntity,
  AllocateInventoryOrderEntityClass,
  AllocateInventoryOrderItemEntity,
  AllocateInventoryOrderItemEntityClass,
  StockEntity,
  StockEntityClass,
} from '../models';
import { DataSource, EntityManager, EntityTarget } from 'typeorm';
import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import {
  CreateAllocateInventoryOrderInput,
  UpdateAllocateInventoryOrderInput,
} from '../typings/create-allocate-inventory-order.input';
import { HelperService } from './helper.service';

@Injectable()
export class AllocateInventoryOrderService<
  T extends
    AllocateInventoryOrderEntityClass = AllocateInventoryOrderEntityClass,
  K extends
    AllocateInventoryOrderItemEntityClass = AllocateInventoryOrderItemEntityClass,
> {
  private readonly seqPrefix = 'AIO';

  constructor(
    private readonly dataSource: DataSource,
    private readonly helperService: HelperService,
    @Inject(AllocateInventoryOrderEntity)
    readonly allocateInventoryOrderEntity: EntityTarget<T>,
    @Inject(AllocateInventoryOrderItemEntity)
    readonly allocateInventoryOrderItemEntity: EntityTarget<K>,
    @Inject(StockEntity) readonly stockEntity: EntityTarget<StockEntityClass>,
  ) {}

  private getRepositories(manager: EntityManager) {
    return {
      allocateInventoryOrder:
        manager.getRepository<AllocateInventoryOrderEntityClass>(
          this.allocateInventoryOrderEntity,
        ),
      allocateInventoryOrderItem:
        manager.getRepository<AllocateInventoryOrderItemEntityClass>(
          this.allocateInventoryOrderItemEntity,
        ),
      allocateInventoryOrderChange: manager.getRepository(
        AllocateInventoryOrderChangeEntityClass,
      ),
      order: manager.getRepository<OrderEntity>(OrderEntity),
      stock: manager.getRepository<StockEntityClass>(this.stockEntity),
    };
  }

  private async processAllocateInventoryOrderItems(
    items: Partial<AllocateInventoryOrderItemEntityClass>[],
    repos: ReturnType<typeof this.getRepositories>,
  ): Promise<void> {
    await Promise.all(
      items.map(async (data) => {
        const item = await repos.allocateInventoryOrderItem.save(
          repos.allocateInventoryOrderItem.create(data),
        );
        const base = await repos.order.save({});

        await repos.allocateInventoryOrderChange.save(
          repos.allocateInventoryOrderChange.create({
            item,
            order: base,
            quantityChanged: data.targetAllocatedQuantity,
          }),
        );

        await repos.stock.save(
          repos.stock.create([
            // add allocated stock
            {
              orderId: base.id,
              materialId: item.materialId,
              batchId: item.batchId,
              locationId: item.locationId || undefined,
              loaderId: item.loaderId || undefined,
              quantity: item.targetAllocatedQuantity,
            },
            // deduct allocated stock from free stock
            {
              orderId: base.id,
              materialId: item.materialId,
              batchId: item.batchId,
              locationId: item.locationId || undefined,
              loaderId: item.loaderId || undefined,
              quantity: -1 * item.targetAllocatedQuantity,
            },
          ]),
        );
      }),
    );
  }

  async createAllocateInventoryOrder(
    options: CreateAllocateInventoryOrderInput,
    manager = this.dataSource.manager,
  ): Promise<T> {
    const repos = this.getRepositories(manager);
    const key = await this.helperService.getSeq(this.seqPrefix);
    const order = await repos.allocateInventoryOrder.save(
      repos.allocateInventoryOrder.create({
        key,
        ...options,
      }),
    );

    if (options.items?.length) {
      const items = options.items.map((item) => ({
        ...item,
        orderId: order.id,
      }));
      await this.processAllocateInventoryOrderItems(items, repos);
    }

    return order as T;
  }

  async updateAllocateInventoryOrder({
    id,
    manager = this.dataSource.manager,
    ...options
  }: UpdateAllocateInventoryOrderInput & {
    manager?: EntityManager;
  }): Promise<T> {
    const repos = this.getRepositories(manager);

    const order = await repos.allocateInventoryOrder.findOneBy({ id });
    const updated = await repos.allocateInventoryOrder.save({
      ...order,
      ...options,
    });

    if (options.items?.length) {
      const existingItemIds = new Set(
        (
          await repos.allocateInventoryOrderItem.find({
            where: { orderId: id },
            relations: ['changes'],
          })
        ).map((item) => item.id),
      );

      const newItems: Partial<AllocateInventoryOrderItemEntityClass>[] = [];
      const existingItems: Partial<AllocateInventoryOrderItemEntityClass>[] =
        [];

      options.items.forEach((item) => {
        if (item.removedAt) return;
        if (!item.id) newItems.push({ ...item, orderId: id });
        else if (existingItemIds.has(item.id))
          existingItems.push({ ...item, orderId: id });
      });

      if (newItems.length)
        await this.processAllocateInventoryOrderItems(newItems, repos);
      if (existingItems.length)
        await Promise.all(
          existingItems.map((item) =>
            repos.allocateInventoryOrderItem.create(item),
          ),
        );
    }

    return updated as T;
  }
}
