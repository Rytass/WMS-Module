import { Inject, Injectable } from '@nestjs/common';
import {
  HoldInventoryOrderChangeEntityClass,
  HoldInventoryOrderEntity,
  HoldInventoryOrderEntityClass,
  HoldInventoryOrderItemEntity,
  HoldInventoryOrderItemEntityClass,
  StockEntity,
  StockEntityClass,
} from '../models';
import {
  DataSource,
  DeepPartial,
  EntityManager,
  EntityTarget,
  In,
} from 'typeorm';
import { HelperService } from './helper.service';
import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import {
  CreateHoldInventoryOrderInput,
  UpdateHoldInventoryOrderInput,
} from '../typings/create-hold-inventory-order.input';
import { FindHoldInventoryOrderInput } from '../typings/find-hold-inventory-order.input';
import { ReleaseInventoryOrderItemInput } from '../typings/release-inventory-order.input';
import { MaterialService } from './material.service';
import { BatchService } from './batch.service';

@Injectable()
export class HoldInventoryOrderService<
  T extends HoldInventoryOrderEntityClass = HoldInventoryOrderEntityClass,
  K extends
    HoldInventoryOrderItemEntityClass = HoldInventoryOrderItemEntityClass,
> {
  private readonly seqPrefix = 'HIO';

  constructor(
    private readonly dataSource: DataSource,
    private readonly helperService: HelperService,
    private readonly materialService: MaterialService,
    private readonly batchService: BatchService,
    @Inject(HoldInventoryOrderEntity)
    readonly holdInventoryOrderEntity: EntityTarget<T>,
    @Inject(HoldInventoryOrderItemEntity)
    readonly holdInventoryOrderItemEntity: EntityTarget<K>,
    @Inject(StockEntity) readonly stockEntity: EntityTarget<StockEntityClass>,
  ) {}

  private getRepositories(manager: EntityManager) {
    return {
      holdInventoryOrder: manager.getRepository<HoldInventoryOrderEntityClass>(
        this.holdInventoryOrderEntity,
      ),
      holdInventoryOrderItem:
        manager.getRepository<HoldInventoryOrderItemEntityClass>(
          this.holdInventoryOrderItemEntity,
        ),
      holdInventoryOrderChange: manager.getRepository(
        HoldInventoryOrderChangeEntityClass,
      ),
      stock: manager.getRepository<StockEntityClass>(this.stockEntity),
      order: manager.getRepository(OrderEntity),
    };
  }

  private async processHoldInventoryOrderItems(
    items: Partial<HoldInventoryOrderItemEntityClass>[],
    repos: ReturnType<typeof this.getRepositories>,
    manager: EntityManager,
  ): Promise<void> {
    await Promise.all(
      items.map(async (data) => {
        // Ensure required fields are present
        if (!data.batchId || !data.materialId) return;

        // Split batch first with held flag to track held state
        const splittedBatch = await this.batchService.splitBatch({
          id: data.batchId,
          held: true,
          manager,
        });

        // Save item with ORIGINAL batch id to maintain source state
        const item = await repos.holdInventoryOrderItem.save(
          repos.holdInventoryOrderItem.create(data),
        );
        const base = await repos.order.save({});
        const conversionFactor = await this.materialService.getConversionFactor(
          item.materialId,
          item.unitId || undefined,
        );

        await repos.holdInventoryOrderChange.save(
          repos.holdInventoryOrderChange.create({
            itemId: item.id,
            id: base.id,
            quantityChanged: item.targetHeldQuantity * conversionFactor,
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
              quantity: -1 * item.targetHeldQuantity * conversionFactor,
            } as DeepPartial<StockEntityClass>,
            // add to splitted batch in held state
            {
              orderId: base.id,
              materialId: item.materialId,
              batchId: splittedBatch.id, // splitted batch marked held
              locationId: item.locationId || undefined,
              loaderId: item.loaderId || undefined,
              quantity: item.targetHeldQuantity * conversionFactor,
            } as DeepPartial<StockEntityClass>,
          ]),
        );
      }),
    );
  }

  async createHoldInventoryOrder(
    options: CreateHoldInventoryOrderInput,
    manager = this.dataSource.manager,
  ): Promise<T> {
    const repos = this.getRepositories(manager);

    const key = await this.helperService.getSeq(this.seqPrefix, manager);
    const order = await repos.holdInventoryOrder.save(
      repos.holdInventoryOrder.create({ key, ...options }),
    );

    if (options.items?.length > 0) {
      const items = options.items.map((item) => ({
        ...item,
        orderId: order.id,
      }));
      await this.processHoldInventoryOrderItems(items, repos, manager);
    }
    return order as T;
  }

  async updateHoldInventoryOrder({
    id,
    manager = this.dataSource.manager,
    ...options
  }: UpdateHoldInventoryOrderInput & { manager?: EntityManager }): Promise<T> {
    const repos = this.getRepositories(manager);

    const order = await repos.holdInventoryOrder.findOneBy({ id });
    const updated = await repos.holdInventoryOrder.save({
      ...order,
      ...options,
    });

    if (options.items?.length) {
      const existingItemIds = new Set(
        (
          await repos.holdInventoryOrderItem.find({ where: { orderId: id } })
        ).map((i) => i.id),
      );

      const newItems: Partial<HoldInventoryOrderItemEntityClass>[] = [];
      const existingItems: Partial<HoldInventoryOrderItemEntityClass>[] = [];

      options.items.forEach((item) => {
        if (item.removedAt) return;
        if (!item.id) newItems.push({ ...item, orderId: id });
        else if (existingItemIds.has(item.id))
          existingItems.push({ ...item, orderId: id });
      });

      if (newItems.length)
        await this.processHoldInventoryOrderItems(newItems, repos, manager);
      if (existingItems.length)
        repos.holdInventoryOrderItem.save(
          await Promise.all(
            existingItems.map((item) =>
              repos.holdInventoryOrderItem.create(item),
            ),
          ),
        );
    }

    return updated as T;
  }

  findMany(options: FindHoldInventoryOrderInput): Promise<[T[], number]> {
    const queryBuilder = this.dataSource
      .getRepository<T>(this.holdInventoryOrderEntity)
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

  async release(
    options: ReleaseInventoryOrderItemInput[],
    manager = this.dataSource.manager,
  ): Promise<T> {
    const repos = this.getRepositories(manager);

    const key = await this.helperService.getSeq(this.seqPrefix, manager);
    const order = await repos.holdInventoryOrder.save(
      repos.holdInventoryOrder.create({ key }),
    );

    if (options.length > 0) {
      await Promise.all(
        options.map(async (data) => {
          // Ensure required fields are present
          if (!data.batchId || !data.materialId) return;

          const splittedBatch = await this.batchService.splitBatch({
            id: data.batchId,
            held: false, // split to release the hold
            manager,
          });

          // Save item with ORIGINAL batch id to maintain source state
          const item = await repos.holdInventoryOrderItem.save(
            repos.holdInventoryOrderItem.create({
              ...data,
              targetHeldQuantity: -1 * data.quantity,
              orderId: order.id,
            }),
          );
          const base = await repos.order.save({});
          const conversionFactor =
            await this.materialService.getConversionFactor(
              item.materialId,
              item.unitId || undefined,
            );

          const change = await repos.holdInventoryOrderChange.save(
            repos.holdInventoryOrderChange.create({
              itemId: item.id,
              id: base.id,
              quantityChanged: -1 * item.targetHeldQuantity * conversionFactor,
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
                quantity: -1 * change.quantityChanged * conversionFactor,
              } as DeepPartial<StockEntityClass>,
              // add to splitted batch in released state
              {
                orderId: base.id,
                materialId: item.materialId,
                batchId: splittedBatch.id, // splitted batch marked released
                locationId: item.locationId || undefined,
                loaderId: item.loaderId || undefined,
                quantity: change.quantityChanged * conversionFactor,
              } as DeepPartial<StockEntityClass>,
            ]),
          );
        }),
      );
    }
    return order as T;
  }
}
