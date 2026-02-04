import { Inject, Injectable } from '@nestjs/common';
import {
  StockEntity,
  StockEntityClass,
  TransferOrderChangeEntityClass,
  TransferOrderEntity,
  TransferOrderEntityClass,
  TransferOrderItemEntity,
  TransferOrderItemEntityClass,
} from '../models';
import { DataSource, EntityManager, EntityTarget, In } from 'typeorm';
import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import { HelperService } from './helper.service';
import {
  CreateTransferOrderInput,
  UpdateTransferOrderInput,
} from '../typings/create-transfer-order.input';
import { FindTransferOrderInput } from '../typings/find-transfer-order.input';
import { TransferOrderInput } from '../typings/transfer-order.input';

@Injectable()
export class TransferOrderService<
  T extends TransferOrderEntityClass = TransferOrderEntityClass,
  K extends TransferOrderItemEntityClass = TransferOrderItemEntityClass,
> {
  private readonly seqPrefix = 'TO';

  constructor(
    private readonly dataSource: DataSource,
    private readonly helperService: HelperService,
    @Inject(TransferOrderEntity) readonly transferOrderEntity: EntityTarget<T>,
    @Inject(TransferOrderItemEntity)
    readonly transferOrderItemEntity: EntityTarget<K>,
    @Inject(StockEntity)
    readonly stockEntity: EntityTarget<StockEntityClass>,
  ) {}

  private getRepositories(manager: EntityManager) {
    return {
      transferOrder: manager.getRepository<TransferOrderEntityClass>(
        this.transferOrderEntity,
      ),
      transferOrderItem: manager.getRepository<TransferOrderItemEntityClass>(
        this.transferOrderItemEntity,
      ),
      transferOrderChange: manager.getRepository(
        TransferOrderChangeEntityClass,
      ),
      order: manager.getRepository(OrderEntity),
      stock: manager.getRepository<StockEntityClass>(this.stockEntity),
    };
  }

  /**
   * Process transfer order items (create transfer records and update stock)
   */
  private async processTransferOrderItems(
    items: Partial<TransferOrderItemEntityClass>[],
    repos: ReturnType<typeof this.getRepositories>,
  ): Promise<void> {
    await Promise.all(
      items.map(async (data) => {
        const item = await repos.transferOrderItem.save(
          repos.transferOrderItem.create(data),
        );
        const base = await repos.order.save({});

        await repos.transferOrderChange.save(
          repos.transferOrderChange.create({
            itemId: item.id,
            id: base.id,
            quantityChanged: item.targetTransferredQuantity,
          }),
        );

        await repos.stock.save(
          repos.stock.create([
            // add pending transfer stock to destination location
            {
              orderId: base.id,
              materialId: item.materialId,
              batchId: item.batchId,
              locationId: item.locationId,
              loaderId: item.loaderId || undefined,
              quantity: item.targetTransferredQuantity,
            },
            // deduct stock from source location
            {
              orderId: base.id,
              materialId: item.materialId,
              batchId: item.batchId,
              locationId: item.locationId,
              loaderId: item.loaderId || undefined,
              quantity: -1 * item.targetTransferredQuantity,
            },
          ]),
        );
      }),
    );
  }

  async createTransferOrder(
    options: CreateTransferOrderInput,
    manager = this.dataSource.manager,
  ): Promise<T> {
    const repos = this.getRepositories(manager);

    const key = await this.helperService.getSeq(this.seqPrefix, manager);
    const order = await repos.transferOrder.save(
      repos.transferOrder.create({ key, ...options }),
    );

    if (options.items?.length > 0) {
      const items = options.items.map(
        (item) =>
          ({
            ...item,
            orderId: order.id,
            targetLoaderId: options.loaderId,
            targetLocationId: options.locationId,
          }) as Partial<TransferOrderItemEntityClass>,
      );
      // TODO: check stock availability before creating transfer order
      await this.processTransferOrderItems(items, repos);
    }

    return order as T;
  }

  async updateTransferOrder({
    id,
    manager = this.dataSource.manager,
    ...options
  }: UpdateTransferOrderInput & { manager?: EntityManager }): Promise<T> {
    const repos = this.getRepositories(manager);

    const order = await repos.transferOrder.findOneByOrFail({ id });
    const updated = await repos.transferOrder.save(
      repos.transferOrder.create({ ...order, ...options }),
    );

    if (options.items?.length) {
      const existingItemIds = new Set(
        (await repos.transferOrderItem.find({ where: { orderId: id } })).map(
          (i) => i.id,
        ),
      );

      const newItems: Partial<TransferOrderItemEntityClass>[] = [];
      const existingItems: Partial<TransferOrderItemEntityClass>[] = [];

      options.items.forEach((item) => {
        if (item.removedAt) return;
        if (!item.id) {
          newItems.push({ ...item, orderId: order.id });
        } else if (existingItemIds.has(item.id)) {
          existingItems.push(item);
        }
      });

      // Process new items with stock updates
      if (newItems.length) {
        // TODO: check stock availability before creating transfer order
        await this.processTransferOrderItems(newItems, repos);
      }

      // Update existing items
      if (existingItems.length) {
        await Promise.all(
          existingItems.map((item) =>
            repos.transferOrderItem.save(repos.transferOrderItem.create(item)),
          ),
        );
      }
    }

    return updated as T;
  }

  findMany(options: FindTransferOrderInput): Promise<[T[], number]> {
    const queryBuilder = this.dataSource
      .getRepository<T>(this.transferOrderEntity)
      .createQueryBuilder('to');

    if (options.key)
      queryBuilder.andWhere('to.key ILIKE :key', { key: `%${options.key}%` });

    if (options.receiver)
      queryBuilder.andWhere('to.receiver ILIKE :receiver', {
        receiver: `%${options.receiver}%`,
      });

    if (options.description)
      queryBuilder.andWhere('to.description ILIKE :description', {
        description: `%${options.description}%`,
      });

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

  transfer(
    options: TransferOrderInput[] | TransferOrderInput,
  ): Promise<boolean> {
    if (!Array.isArray(options)) options = [options];
    return this.dataSource.transaction(async (manager) => {
      const changeRepository = manager.getRepository(
        TransferOrderChangeEntityClass,
      );
      const itemRepository =
        manager.getRepository<TransferOrderItemEntityClass>(
          this.transferOrderItemEntity,
        );
      const stockRepository = manager.getRepository<StockEntityClass>(
        this.stockEntity,
      );

      const items = await itemRepository.find({
        where: { id: In(options.map((o) => o.itemId)) },
        relations: ['changes'],
      });

      const itemMap = new Map(items.map((item) => [item.id, item]));

      await Promise.all(
        options.map(async (option) => {
          const item = itemMap.get(option.itemId);
          if (!item) return;

          const totalTransferred = item.changes.reduce((sum, change) => {
            if (change.quantityChanged < 0)
              sum += Number(change.quantityChanged);
            return sum;
          }, 0);

          const remainingQuantity =
            item.targetTransferredQuantity + totalTransferred;

          if (remainingQuantity - option.quantity < 0)
            throw new Error(
              `Transfer quantity exceeds remaining quantity for item ${item.id}`,
            );

          // Record the transfer change
          const base = await manager.getRepository(OrderEntity).save({});

          await Promise.all([
            changeRepository.save(
              changeRepository.create({
                itemId: item.id,
                id: base.id,
                quantityChanged: -1 * option.quantity,
              }),
            ),
            // Update stock levels
            stockRepository.save(
              stockRepository.create([
                // add FREE stock to destination location
                {
                  orderId: base.id,
                  materialId: item.materialId,
                  batchId: item.batchId,
                  locationId: item.locationId || undefined,
                  loaderId: item.loaderId || undefined,
                  quantity: option.quantity,
                },
                // deduct IN_TRANSFER stock from source location
                {
                  orderId: base.id,
                  materialId: item.materialId,
                  batchId: item.batchId,
                  locationId: item.targetLocationId || undefined,
                  loaderId: item.targetLoaderId || undefined,
                  quantity: -1 * option.quantity,
                },
              ]),
            ),
          ]);
        }),
      );

      return true;
    });
  }
}
