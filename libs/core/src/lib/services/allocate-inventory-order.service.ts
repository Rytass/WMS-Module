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
import { DataSource, EntityManager, EntityTarget, In } from 'typeorm';
import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import {
  CreateAllocateInventoryOrderInput,
  UpdateAllocateInventoryOrderInput,
} from '../typings/create-allocate-inventory-order.input';
import { HelperService } from './helper.service';
import { DeallocateInventoryOrderItemInput } from '../typings/deallocate-inventory-order';
import { MaterialService } from './material.service';
import { FindAllocateInventoryOrderInput } from '../typings/find-allocate-inventory-order.input';

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
    private readonly materialService: MaterialService,
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
        const conversionFactor = await this.materialService.getConversionFactor(
          item.materialId,
          item.unitId || undefined,
        );

        await repos.allocateInventoryOrderChange.save(
          repos.allocateInventoryOrderChange.create({
            item,
            order: base,
            quantityChanged: item.targetAllocatedQuantity * conversionFactor,
            source: data.status,
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
              quantity: item.targetAllocatedQuantity * conversionFactor,
            },
            // deduct allocated stock from free stock
            {
              orderId: base.id,
              materialId: item.materialId,
              batchId: item.batchId,
              locationId: item.locationId || undefined,
              loaderId: item.loaderId || undefined,
              quantity: -1 * item.targetAllocatedQuantity * conversionFactor,
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
        await repos.allocateInventoryOrderItem.save(
          await Promise.all(
            existingItems.map((item) =>
              repos.allocateInventoryOrderItem.create(item),
            ),
          ),
        );
    }

    return updated as T;
  }

  deallocate(
    options:
      | DeallocateInventoryOrderItemInput
      | DeallocateInventoryOrderItemInput[],
  ): Promise<boolean> {
    if (!Array.isArray(options)) options = [options];
    return this.dataSource.transaction(async (manager) => {
      const repos = this.getRepositories(manager);
      const items = await repos.allocateInventoryOrderItem.find({
        where: { id: In(options.map((o) => o.itemId)) },
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

          const totalAllocated = item.changes.reduce((sum, change) => {
            if (change.quantityChanged < 0)
              sum += Number(change.quantityChanged);
            return sum;
          }, 0);

          const remainingQuantity =
            conversionFactor * item.targetAllocatedQuantity + totalAllocated;

          if (remainingQuantity - option.quantity * conversionFactor < 0)
            throw new Error(
              `Deallocate quantity exceeds allocated quantity for item ${item.id}`,
            );

          const base = await repos.order.save({});
          await Promise.all([
            repos.allocateInventoryOrderChange.save(
              repos.allocateInventoryOrderChange.create({
                itemId: item.id,
                id: base.id,
                quantityChanged: -1 * option.quantity * conversionFactor,
                source: item.status,
              }),
            ),
            repos.stock.save(
              repos.stock.create([
                // add deallocated stock to free stock
                {
                  orderId: base.id,
                  materialId: item.materialId,
                  batchId: item.batchId,
                  locationId: item.locationId || undefined,
                  loaderId: item.loaderId || undefined,
                  quantity: option.quantity * conversionFactor,
                },
                // deduct deallocated stock from allocated stock
                {
                  orderId: base.id,
                  materialId: item.materialId,
                  batchId: item.batchId,
                  locationId: item.locationId || undefined,
                  loaderId: item.loaderId || undefined,
                  quantity: -1 * option.quantity * conversionFactor,
                },
              ]),
            ),
          ]);
        }),
      );
      return true;
    });
  }

  findMany(options: FindAllocateInventoryOrderInput): Promise<[T[], number]> {
    const queryBuilder = this.dataSource
      .getRepository<T>(this.allocateInventoryOrderEntity)
      .createQueryBuilder('to');

    if (options.key)
      queryBuilder.andWhere('to.key ILIKE :key', { key: `%${options.key}%` });

    if (options.dateRange)
      queryBuilder.andWhere('to.createdAt BETWEEN :start AND :end', {
        start: options.dateRange.from,
        end: options.dateRange.to,
      });

    if (options.materialId)
      queryBuilder.innerJoin(
        'to.items',
        'm_items',
        'm_items.materialId = :materialId',
        {
          materialId: options.materialId,
        },
      );

    if (options.batchId)
      queryBuilder.innerJoin(
        'to.items',
        'b_items',
        'b_items.batchId = :batchId',
        {
          batchId: options.batchId,
        },
      );

    if (options.locationId)
      queryBuilder.innerJoin(
        'to.items',
        'l_items',
        'l_items.locationId = :locationId',
        {
          locationId: options.locationId,
        },
      );

    if (options.loaderId)
      queryBuilder.innerJoin(
        'to.items',
        'ld_items',
        'ld_items.loaderId = :loaderId',
        {
          loaderId: options.loaderId,
        },
      );

    if (options.offset !== undefined && options.offset >= 0)
      queryBuilder.skip(options.offset);

    if (options.limit !== undefined && options.limit > 0)
      queryBuilder.take(options.limit);

    return queryBuilder.getManyAndCount();
  }
}
