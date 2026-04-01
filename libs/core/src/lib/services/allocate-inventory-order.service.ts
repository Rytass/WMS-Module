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
import {
  DataSource,
  DeepPartial,
  EntityManager,
  EntityTarget,
  In,
  IsNull,
  Not,
} from 'typeorm';
import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import {
  CreateAllocateInventoryOrderInput,
  UpdateAllocateInventoryOrderInput,
} from '../typings/create-allocate-inventory-order.input';
import { HelperService } from './helper.service';
import { DeallocateInventoryOrderItemInput } from '../typings/deallocate-inventory-order';
import { MaterialService } from './material.service';
import { FindAllocateInventoryOrderInput } from '../typings/find-allocate-inventory-order.input';
import { BatchService } from './batch.service';

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
    private readonly batchService: BatchService,
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
    manager: EntityManager,
  ): Promise<void> {
    const repos = this.getRepositories(manager);
    await Promise.all(
      items.map(async (data) => {
        // Ensure required fields are present
        if (!data.batchId || !data.materialId) return;

        // Split batch first with saleId/saleSerialId to track allocation state
        const splittedBatch = await this.batchService.splitBatch({
          id: data.batchId,
          saleId: data.saleId,
          saleSerialId: data.saleSerialId,
          manager,
        });

        // Save item with ORIGINAL batch id to maintain source state
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
          }),
        );

        // Stock movements track the allocation through splitted batch
        await repos.stock.save(
          repos.stock.create([
            // deduct from original batch available stock
            {
              orderId: base.id,
              materialId: item.materialId,
              batchId: item.batchId, // original batch
              locationId: item.locationId || undefined,
              loaderId: item.loaderId || undefined,
              quantity: -1 * item.targetAllocatedQuantity * conversionFactor,
            } as DeepPartial<StockEntityClass>,
            // add to splitted batch in allocated state
            {
              orderId: base.id,
              materialId: item.materialId,
              batchId: splittedBatch.id, // splitted batch marked with saleId
              locationId: item.locationId || undefined,
              loaderId: item.loaderId || undefined,
              quantity: item.targetAllocatedQuantity * conversionFactor,
            } as DeepPartial<StockEntityClass>,
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
    const { items, ...orderOptions } = options;
    const order = await repos.allocateInventoryOrder.save(
      repos.allocateInventoryOrder.create({
        key,
        ...orderOptions,
      }),
    );

    if (items?.length) {
      const processedItems = items.map((item) => ({
        ...item,
        orderId: order.id,
      }));
      await this.processAllocateInventoryOrderItems(processedItems, manager);
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
    const { items, ...orderOptions } = options;

    const order = await repos.allocateInventoryOrder.findOneBy({ id });
    const updated = await repos.allocateInventoryOrder.save({
      ...order,
      ...orderOptions,
    });

    if (items?.length) {
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

      items.forEach((item) => {
        if (!item.id) newItems.push({ ...item, orderId: id });
        else if (existingItemIds.has(item.id))
          existingItems.push({ ...item, orderId: id });
      });

      if (newItems.length)
        await this.processAllocateInventoryOrderItems(newItems, manager);
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

  async deallocate(
    options:
      | DeallocateInventoryOrderItemInput
      | DeallocateInventoryOrderItemInput[],
    manager = this.dataSource.manager,
  ): Promise<T> {
    if (!Array.isArray(options)) options = [options];
    const repos = this.getRepositories(manager);

    const key = await this.helperService.getSeq(this.seqPrefix, manager);
    const order = await repos.allocateInventoryOrder.save(
      repos.allocateInventoryOrder.create({ key }),
    );

    if (options.length > 0) {
      await Promise.all(
        options.map(async (data) => {
          // Ensure required fields are present
          if (!data.batchId || !data.materialId) return;

          const originalBatch =
            await this.batchService.batchRepository.findOneByOrFail({
              id: data.batchId,
              saleId: Not(IsNull()),
              saleSerialId: Not(IsNull()),
            });
          const splittedBatch = await this.batchService.splitBatch({
            id: data.batchId,
            saleId: null, // mark splitted batch with null saleId to indicate deallocation
            saleSerialId: null,
            manager,
          });

          // Save item with ORIGINAL batch id to maintain source state
          const item = await repos.allocateInventoryOrderItem.save(
            repos.allocateInventoryOrderItem.create({
              ...data,
              saleId: originalBatch.saleId as string,
              saleSerialId: originalBatch.saleSerialId as string,
              targetAllocatedQuantity: -1 * data.quantity,
              orderId: order.id,
            }),
          );

          const base = await repos.order.save({});
          const conversionFactor =
            await this.materialService.getConversionFactor(
              item.materialId,
              item.unitId || undefined,
            );

          const change = await repos.allocateInventoryOrderChange.save(
            repos.allocateInventoryOrderChange.create({
              itemId: item.id,
              id: base.id,
              quantityChanged:
                -1 * item.targetAllocatedQuantity * conversionFactor,
            }),
          );
          // Stock movements track the hold through splitted batch
          await repos.stock.save(
            repos.stock.create([
              // deduct from original batch available stock
              {
                orderId: base.id,
                materialId: item.materialId,
                batchId: item.batchId, // original batch
                locationId: item.locationId || undefined,
                loaderId: item.loaderId || undefined,
                quantity: -1 * change.quantityChanged,
              } as DeepPartial<StockEntityClass>,
              // add to splitted batch in released state
              {
                orderId: base.id,
                materialId: item.materialId,
                batchId: splittedBatch.id, // splitted batch marked deallocated with null saleId
                locationId: item.locationId || undefined,
                loaderId: item.loaderId || undefined,
                quantity: change.quantityChanged,
              } as DeepPartial<StockEntityClass>,
            ]),
          );
        }),
      );
    }
    return order as T;
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
