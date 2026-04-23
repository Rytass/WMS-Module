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
import {
  DataSource,
  DeepPartial,
  EntityManager,
  EntityTarget,
  In,
  Repository,
} from 'typeorm';
import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import { HelperService } from './helper.service';
import {
  CreateTransferOrderInput,
  UpdateTransferOrderInput,
} from '../typings/create-transfer-order.input';
import { FindTransferOrderInput } from '../typings/find-transfer-order.input';
import { TransferOrderInput } from '../typings/transfer-order.input';
import { CancelTransferOrderInput } from '../typings/cancel-transfer-order.input';
import { MaterialService } from './material.service';
import { BatchService } from './batch.service';
import { StockService } from './stock.service';

@Injectable()
export class TransferOrderService<
  T extends TransferOrderEntityClass = TransferOrderEntityClass,
  K extends TransferOrderItemEntityClass = TransferOrderItemEntityClass,
> {
  private readonly seqPrefix = 'TO';
  readonly transferOrderRepository: Repository<T>;
  constructor(
    private readonly dataSource: DataSource,
    private readonly helperService: HelperService,
    private readonly materialService: MaterialService,
    private readonly batchService: BatchService,
    private readonly stockService: StockService,
    @Inject(TransferOrderEntity) readonly transferOrderEntity: EntityTarget<T>,
    @Inject(TransferOrderItemEntity)
    readonly transferOrderItemEntity: EntityTarget<K>,
    @Inject(StockEntity)
    readonly stockEntity: EntityTarget<StockEntityClass>,
  ) {
    this.transferOrderRepository = this.dataSource.getRepository(
      this.transferOrderEntity,
    );
  }

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
    manager: EntityManager,
  ): Promise<void> {
    await Promise.all(
      items.map(async (data) => {
        // Ensure required fields are present
        if (!data.batchId || !data.materialId) return;

        // Save item with ORIGINAL batch id to maintain source state
        const item = await repos.transferOrderItem.save(
          repos.transferOrderItem.create(data),
        );
        // Split batch first with inTransfer flag to track transfer state
        const splittedBatch = await this.batchService.splitBatch({
          id: data.batchId,
          transferId: item.orderId,
          manager,
        });

        const base = await repos.order.save({});
        const conversionFactor = await this.materialService.getConversionFactor(
          item.materialId,
          item.unitId || undefined,
        );

        await repos.transferOrderChange.save(
          repos.transferOrderChange.create({
            itemId: item.id,
            id: base.id,
            quantityChanged: item.targetTransferredQuantity * conversionFactor,
          }),
        );

        // Stock movements track the transfer through splitted batch
        await this.stockService.validateStockAvailability(
          {
            materialId: item.materialId,
            batchId: item.batchId,
            locationId: item.locationId || undefined,
            loaderId: this.stockService.resolveLoaderId(item.loaderId),
            quantity: item.targetTransferredQuantity * conversionFactor,
          },
          manager,
        );

        await repos.stock.save(
          repos.stock.create([
            // deduct from original batch source
            {
              orderId: base.id,
              materialId: item.materialId,
              batchId: item.batchId, // original batch
              locationId: item.locationId || undefined,
              loaderId: this.stockService.resolveLoaderId(item.loaderId),
              quantity: -1 * item.targetTransferredQuantity * conversionFactor,
            } as DeepPartial<StockEntityClass>,
            // add to splitted batch in transfer state
            {
              orderId: base.id,
              materialId: item.materialId,
              batchId: splittedBatch.id, // splitted batch marked inTransfer
              locationId: item.locationId || undefined,
              loaderId: this.stockService.resolveLoaderId(item.loaderId),
              quantity: item.targetTransferredQuantity * conversionFactor,
            } as DeepPartial<StockEntityClass>,
          ]),
        );
      }),
    );
  }

  async cancelTransfer(
    options: CancelTransferOrderInput[] | CancelTransferOrderInput,
  ): Promise<boolean> {
    if (!Array.isArray(options)) options = [options];
    return this.dataSource.transaction(async (transactionManager) => {
      await this.cancelTransferInternal(options, transactionManager);
      return true;
    });
  }

  /**
   * Internal cancel method that accepts a manager for transaction support
   */
  private async cancelTransferInternal(
    options: CancelTransferOrderInput[],
    manager: EntityManager,
  ): Promise<void> {
    const repos = this.getRepositories(manager);
    const items = await repos.transferOrderItem.find({
      where: { id: In(options.map((o) => o.itemId)) },
      relations: ['changes'],
    });

    const itemMap = new Map(items.map((item) => [item.id, item]));

    await Promise.all(
      options.map(async (option) => {
        const item = itemMap.get(option.itemId);
        if (!item) return;

        const conversionFactor = await this.materialService.getConversionFactor(
          item.materialId,
          item.unitId || undefined,
        );

        const totalChanged = item.changes.reduce(
          (sum, change) => sum + Number(change.quantityChanged),
          0,
        );

        const remainingQuantity =
          conversionFactor * item.targetTransferredQuantity - totalChanged;

        // If quantity not provided, cancel all remaining cancellable quantity
        const cancelQuantity =
          option.quantity != null
            ? option.quantity * conversionFactor
            : remainingQuantity;

        if (remainingQuantity - cancelQuantity < 0) {
          throw new Error(
            `Cancel quantity exceeds pending transfer for item ${option.itemId}`,
          );
        }

        if (cancelQuantity <= 0) return;

        // Generate new splitted batch for cancellation reversal with inTransfer flag
        const reversalBatch = await this.batchService.splitBatch({
          id: item.batchId,
          transferId: item.orderId,
          manager,
        });

        const reverseOrder = await repos.order.save(repos.order.create());

        await this.stockService.validateStockAvailability(
          {
            materialId: item.materialId,
            batchId: reversalBatch.id,
            locationId: item.locationId || undefined,
            loaderId: this.stockService.resolveLoaderId(item.loaderId),
            quantity: cancelQuantity,
          },
          manager,
        );

        // Reverse the stock changes via new splitted batch
        await Promise.all([
          repos.transferOrderChange.save(
            repos.transferOrderChange.create({
              itemId: option.itemId,
              id: reverseOrder.id,
              quantityChanged: -1 * cancelQuantity,
            }),
          ),
          // Stock ledger will reconcile +/- quantities by batch metrics grouping
          repos.stock.save(
            repos.stock.create([
              // re-add to original batch
              {
                orderId: reverseOrder.id,
                materialId: item.materialId,
                batchId: item.batchId, // original batch
                locationId: item.locationId || undefined,
                loaderId: this.stockService.resolveLoaderId(item.loaderId),
                quantity: cancelQuantity,
              } as DeepPartial<StockEntityClass>,
              // remove from new reversal splitted batch (marked inTransfer)
              {
                orderId: reverseOrder.id,
                materialId: item.materialId,
                batchId: reversalBatch.id, // new splitted batch for cancel reversal
                locationId: item.locationId || undefined,
                loaderId: this.stockService.resolveLoaderId(item.loaderId),
                quantity: -1 * cancelQuantity,
              } as DeepPartial<StockEntityClass>,
            ]),
          ),
        ]);
      }),
    );
  }

  /**
   * Remove a transfer order
   * Automatically cancels all remaining pending transfers to release stock
   */
  async removeTransferOrder(id: string): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      const repos = this.getRepositories(manager);

      // Find order
      const order = await repos.transferOrder.findOne({ where: { id } });
      if (!order || order.removedAt) return false;

      // Find all items with changes to calculate cancellable quantities
      const items = await repos.transferOrderItem.find({
        where: { orderId: id },
        relations: ['changes'],
      });

      // Build cancel inputs for items with remaining pending quantity
      const cancelInputs: CancelTransferOrderInput[] = [];
      for (const item of items) {
        const conversionFactor = await this.materialService.getConversionFactor(
          item.materialId,
          item.unitId || undefined,
        );

        const totalChanged = item.changes.reduce(
          (sum, change) => sum + Number(change.quantityChanged),
          0,
        );

        const remainingQuantity =
          conversionFactor * item.targetTransferredQuantity - totalChanged;

        if (remainingQuantity > 0) {
          // Use base quantity (without conversion) since cancelTransferInternal will apply conversion
          cancelInputs.push({
            itemId: item.id,
            quantity: remainingQuantity / conversionFactor,
          });
        }
      }

      // Cancel all remaining pending transfers
      if (cancelInputs.length > 0) {
        await this.cancelTransferInternal(cancelInputs, manager);
      }

      // Mark order as removed
      await repos.transferOrder.update({ id }, { removedAt: new Date() });
      return true;
    });
  }

  async createTransferOrder(
    options: CreateTransferOrderInput,
    manager = this.dataSource.manager,
  ): Promise<T> {
    const repos = this.getRepositories(manager);
    const { items, ...orderOptions } = options;

    const key = await this.helperService.getSeq(this.seqPrefix, manager);
    const order = await repos.transferOrder.save(
      repos.transferOrder.create({ key, ...orderOptions }),
    );

    if (items?.length > 0) {
      const processedItems = items.map(
        (item) =>
          ({
            ...item,
            orderId: order.id,
            targetLoaderId: options.loaderId,
            targetLocationId: options.locationId,
          }) as Partial<TransferOrderItemEntityClass>,
      );
      // TODO: check stock availability before creating transfer order
      await this.processTransferOrderItems(processedItems, repos, manager);
    }

    return order as T;
  }

  async updateTransferOrder({
    id,
    manager = this.dataSource.manager,
    ...options
  }: UpdateTransferOrderInput & { manager?: EntityManager }): Promise<T> {
    const repos = this.getRepositories(manager);
    const { items, ...orderOptions } = options;

    const order = await repos.transferOrder.findOneByOrFail({ id });
    const updated = await repos.transferOrder.save(
      repos.transferOrder.create({ ...order, ...orderOptions }),
    );

    if (items?.length) {
      const existingItemIds = new Set(
        (await repos.transferOrderItem.find({ where: { orderId: id } })).map(
          (i) => i.id,
        ),
      );

      const newItems: Partial<TransferOrderItemEntityClass>[] = [];
      const existingItems: Partial<TransferOrderItemEntityClass>[] = [];

      items.forEach((item) => {
        if (item.removedAt) return;
        if (!item.id) {
          newItems.push({ ...item, orderId: order.id });
        } else if (existingItemIds.has(item.id)) {
          existingItems.push({ ...item, orderId: order.id });
        }
      });

      // Process new items with stock updates
      if (newItems.length) {
        // TODO: check stock availability before creating transfer order
        await this.processTransferOrderItems(newItems, repos, manager);
      }

      // Update existing items
      if (existingItems.length) {
        await repos.transferOrderItem.save(
          await Promise.all(
            existingItems.map((item) => repos.transferOrderItem.create(item)),
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

          const conversionFactor =
            await this.materialService.getConversionFactor(
              item.materialId,
              item.unitId || undefined,
            );

          const totalTransferred = item.changes.reduce((sum, change) => {
            if (change.quantityChanged < 0)
              sum += Number(change.quantityChanged);
            return sum;
          }, 0);

          const remainingQuantity =
            item.targetTransferredQuantity * conversionFactor +
            totalTransferred;

          if (remainingQuantity - option.quantity * conversionFactor < 0)
            throw new Error(
              `Transfer quantity exceeds remaining quantity for item ${item.id}`,
            );

          // Create splitted batch for transfer completion
          const completedBatch = await this.batchService.splitBatch({
            id: item.batchId,
            manager,
          });

          // Record the transfer change
          const base = await manager.getRepository(OrderEntity).save({});

          await this.stockService.validateStockAvailability(
            {
              materialId: item.materialId,
              batchId: completedBatch.id,
              locationId: item.locationId || undefined,
              loaderId: this.stockService.resolveLoaderId(item.loaderId),
              quantity: option.quantity * conversionFactor,
            },
            manager,
          );

          await Promise.all([
            changeRepository.save(
              changeRepository.create({
                itemId: item.id,
                id: base.id,
                quantityChanged: -1 * option.quantity * conversionFactor,
              }),
            ),
            // Update stock levels
            stockRepository.save(
              stockRepository.create([
                // add to destination with original batch reference
                {
                  orderId: base.id,
                  materialId: item.materialId,
                  batchId: item.batchId,
                  locationId: item.targetLocationId || undefined,
                  loaderId: this.stockService.resolveLoaderId(
                    item.targetLoaderId,
                  ),
                  quantity: option.quantity * conversionFactor,
                } as DeepPartial<StockEntityClass>,
                // deduct from completed splitted batch
                {
                  orderId: base.id,
                  materialId: item.materialId,
                  batchId: completedBatch.id,
                  locationId: item.locationId || undefined,
                  loaderId: this.stockService.resolveLoaderId(item.loaderId),
                  quantity: -1 * option.quantity * conversionFactor,
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
