import { Inject, Injectable } from '@nestjs/common';
import {
  LoadersEntityClass,
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
import { StockStatus } from '../constants/stock-status';
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
      loader: manager.getRepository(LoadersEntityClass),
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
            locationId: this.stockService.resolveLocationId(item.locationId),
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
              locationId: this.stockService.resolveLocationId(item.locationId),
              loaderId: this.stockService.resolveLoaderId(item.loaderId),
              quantity: -1 * item.targetTransferredQuantity * conversionFactor,
            } as DeepPartial<StockEntityClass>,
            // add to splitted batch in transfer state
            {
              orderId: base.id,
              materialId: item.materialId,
              batchId: splittedBatch.id, // splitted batch marked inTransfer
              locationId: this.stockService.resolveLocationId(item.locationId),
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

    // Whole-loader transfer cancel validation (Phase 2d-sync).
    // Identical to the commit-side check, except cancel allows option.quantity to
    // be omitted (defaults to "all remaining cancellable" — i.e. the item's
    // targetTransferredQuantity minus any prior committed/cancelled deltas).
    // For whole-loader-mode items, partial cancel is forbidden — the per-group
    // sum must equal loaderTotalQty.
    const wholeLoaderGroupSums = new Map<string, number>();
    for (const option of options) {
      const item = itemMap.get(option.itemId);
      if (!item || !item.loaderId) continue;
      if (item.loaderId === item.targetLoaderId) {
        const factor = await this.materialService.getConversionFactor(
          item.materialId,
          item.unitId || undefined,
        );
        // If option.quantity omitted, defaults to remaining cancellable.
        // Remaining cancellable = targetTransferredQuantity * factor - sum(changes).
        // Same math as the per-option loop below; replicated here for the sum check.
        const cancelQtyBase =
          option.quantity != null
            ? option.quantity * factor
            : item.targetTransferredQuantity * factor -
              item.changes.reduce(
                (sum, c) => sum + Number(c.quantityChanged),
                0,
              );
        wholeLoaderGroupSums.set(
          item.loaderId,
          (wholeLoaderGroupSums.get(item.loaderId) ?? 0) + cancelQtyBase,
        );
      }
    }
    for (const [srcLoaderId, subTotalQty] of wholeLoaderGroupSums) {
      const [aggRows] = await this.stockService.findAggregatedStocks({
        loaderId: srcLoaderId,
        aggregated: true,
      });
      const loaderTotalQty = aggRows.reduce(
        (s, r) => s + Number(r.quantity),
        0,
      );
      if (subTotalQty !== loaderTotalQty) {
        throw new Error(
          `Whole-loader transfer cancel must execute 100% qty (loader=${srcLoaderId}, thisRequest=${subTotalQty}, loaderTotal=${loaderTotalQty})`,
        );
      }
    }

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
            locationId: this.stockService.resolveLocationId(item.locationId),
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
                locationId: this.stockService.resolveLocationId(
                  item.locationId,
                ),
                loaderId: this.stockService.resolveLoaderId(item.loaderId),
                quantity: cancelQuantity,
              } as DeepPartial<StockEntityClass>,
              // remove from new reversal splitted batch (marked inTransfer)
              {
                orderId: reverseOrder.id,
                materialId: item.materialId,
                batchId: reversalBatch.id, // new splitted batch for cancel reversal
                locationId: this.stockService.resolveLocationId(
                  item.locationId,
                ),
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

    // Whole-loader transfer validation (Phase 2d-sync).
    // If any item's source loader matches the header's targetLoaderId, treat the
    // items sharing that source loader as a whole-loader group:
    //   Gate 1: the loader's stocks must be 100% FREE (no orphan-prone HELD/etc.)
    //   Gate 2: those items collectively must cover the loader's full qty
    if (options.loaderId && items?.length) {
      const wholeLoaderSourceIds = new Set<string>();
      for (const item of items) {
        if (item.loaderId && item.loaderId === options.loaderId) {
          wholeLoaderSourceIds.add(item.loaderId);
        }
      }

      for (const srcLoaderId of wholeLoaderSourceIds) {
        const [aggRows] = await this.stockService.findAggregatedStocks({
          loaderId: srcLoaderId,
          aggregated: true,
        });
        // Gate 1
        const nonFree = aggRows.filter((r) => r.status !== StockStatus.FREE);
        if (nonFree.length > 0) {
          const statuses = [...new Set(nonFree.map((r) => r.status))].join(
            ', ',
          );
          throw new Error(
            `Cannot whole-loader transfer: loader ${srcLoaderId} has non-FREE stocks (statuses: ${statuses})`,
          );
        }
        // Gate 2
        const loaderTotalQty = aggRows.reduce(
          (s, r) => s + Number(r.quantity),
          0,
        );
        let subTotalQty = 0;
        for (const item of items) {
          if (item.loaderId === srcLoaderId) {
            // Runtime callers augment items with materialId/batchId/unitId beyond
            // the public CreateTransferOrderItemInput shape (see processTransferOrderItems
            // which expects Partial<TransferOrderItemEntityClass>); access via cast.
            const itemFull =
              item as Partial<TransferOrderItemEntityClass> &
                typeof item;
            if (!itemFull.materialId) continue;
            const factor = await this.materialService.getConversionFactor(
              itemFull.materialId,
              itemFull.unitId || undefined,
            );
            subTotalQty +=
              Number(item.targetTransferredQuantity) * factor;
          }
        }
        if (subTotalQty !== loaderTotalQty) {
          throw new Error(
            `Whole-loader transfer must reserve entire loader qty for loader ${srcLoaderId} (requested=${subTotalQty}, loaderTotal=${loaderTotalQty})`,
          );
        }
      }
    }

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

    if (options.materialKey)
      queryBuilder.andWhere(
        `EXISTS (
          SELECT 1 FROM transfer_order_items to_mat_items
          INNER JOIN materials to_mat ON to_mat.id = to_mat_items."materialId"
          WHERE to_mat_items."orderId" = to.id
          AND to_mat.key ILIKE :materialKey
        )`,
        { materialKey: `%${options.materialKey}%` },
      );

    if (options.batchKey)
      queryBuilder.andWhere(
        `EXISTS (
          SELECT 1 FROM transfer_order_items to_batch_items
          INNER JOIN batches to_batch ON to_batch.id = to_batch_items."batchId"
          WHERE to_batch_items."orderId" = to.id
          AND to_batch.key ILIKE :batchKey
        )`,
        { batchKey: `%${options.batchKey}%` },
      );

    if (options.locationKey)
      queryBuilder.andWhere(
        `EXISTS (
          SELECT 1 FROM transfer_order_items to_loc_items
          INNER JOIN locations to_loc ON to_loc.id = to_loc_items."locationId"
          WHERE to_loc_items."orderId" = to.id
          AND to_loc.key ILIKE :locationKey
        )`,
        { locationKey: `%${options.locationKey}%` },
      );

    if (options.loaderKey)
      queryBuilder.andWhere(
        `EXISTS (
          SELECT 1 FROM transfer_order_items to_ldr_items
          INNER JOIN loaders to_ldr ON to_ldr.id = to_ldr_items."loaderId"
          WHERE to_ldr_items."orderId" = to.id
          AND to_ldr."serialId" ILIKE :loaderKey
        )`,
        { loaderKey: `%${options.loaderKey}%` },
      );

    if (options.targetLocationKey)
      queryBuilder.andWhere(
        `EXISTS (
          SELECT 1 FROM transfer_order_items to_tgt_loc_items
          INNER JOIN locations to_tgt_loc ON to_tgt_loc.id = to_tgt_loc_items."targetLocationId"
          WHERE to_tgt_loc_items."orderId" = to.id
          AND to_tgt_loc.key ILIKE :targetLocationKey
        )`,
        { targetLocationKey: `%${options.targetLocationKey}%` },
      );

    if (options.targetLoaderKey)
      queryBuilder.andWhere(
        `EXISTS (
          SELECT 1 FROM transfer_order_items to_tgt_ldr_items
          INNER JOIN loaders to_tgt_ldr ON to_tgt_ldr.id = to_tgt_ldr_items."targetLoaderId"
          WHERE to_tgt_ldr_items."orderId" = to.id
          AND to_tgt_ldr."serialId" ILIKE :targetLoaderKey
        )`,
        { targetLoaderKey: `%${options.targetLoaderKey}%` },
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

      // Whole-loader transfer commit validation (Phase 2d-sync).
      // Group inputs whose source loaderId == targetLoaderId (whole-loader-mode)
      // by source loaderId, sum the input quantities, and require it to equal the
      // loader's total stock qty. Catches partial-commit attempts AND the
      // receive-onto-moving-loader orphan scenario (loaderTotalQty drifts > sum).
      const wholeLoaderGroupSums = new Map<string, number>();
      for (const option of options) {
        const item = itemMap.get(option.itemId);
        if (!item || !item.loaderId) continue;
        if (item.loaderId === item.targetLoaderId) {
          const factor = await this.materialService.getConversionFactor(
            item.materialId,
            item.unitId || undefined,
          );
          wholeLoaderGroupSums.set(
            item.loaderId,
            (wholeLoaderGroupSums.get(item.loaderId) ?? 0) +
              option.quantity * factor,
          );
        }
      }
      for (const [srcLoaderId, subTotalQty] of wholeLoaderGroupSums) {
        const [aggRows] = await this.stockService.findAggregatedStocks({
          loaderId: srcLoaderId,
          aggregated: true,
        });
        const loaderTotalQty = aggRows.reduce(
          (s, r) => s + Number(r.quantity),
          0,
        );
        if (subTotalQty !== loaderTotalQty) {
          throw new Error(
            `Whole-loader transfer must execute 100% qty (loader=${srcLoaderId}, thisRequest=${subTotalQty}, loaderTotal=${loaderTotalQty})`,
          );
        }
      }

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

          // Locate the existing IN_TRANSFER split (created at reservation time) via
          // idempotent forward sibling-match: same call shape processTransferOrderItems
          // used to create it. No new batch row is written — sibling-match returns the
          // existing IN_TRANSFER batch B for this order. The original batch (item.batchId,
          // transferId=null) is the anchor for the FREE-restore at target loc/loader.
          const inTransferBatch = await this.batchService.splitBatch({
            id: item.batchId,
            transferId: item.orderId,
            manager,
          });

          // Record the transfer change
          const base = await manager.getRepository(OrderEntity).save({});

          // Availability check at the IN_TRANSFER coord — must have ≥ qty to drain
          await this.stockService.validateStockAvailability(
            {
              materialId: item.materialId,
              batchId: inTransferBatch.id,
              locationId: this.stockService.resolveLocationId(item.locationId),
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
            // Stock pair: +qty FREE @ original batch at TARGET loc/loader
            //            -qty IN_TRANSFER @ split batch at SOURCE loc/loader (drains pool)
            // The original-batch FREE at SOURCE loc/loader is left untouched (its
            // reservation-time deduction stays as the durable "moved out of source" record).
            stockRepository.save(
              stockRepository.create([
                // add to destination using original batch (transferId=null → derived FREE)
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
                // drain from the IN_TRANSFER split batch
                {
                  orderId: base.id,
                  materialId: item.materialId,
                  batchId: inTransferBatch.id,
                  locationId: this.stockService.resolveLocationId(
                    item.locationId,
                  ),
                  loaderId: this.stockService.resolveLoaderId(item.loaderId),
                  quantity: -1 * option.quantity * conversionFactor,
                } as DeepPartial<StockEntityClass>,
              ]),
            ),
          ]);

          // Whole-loader transfer (Phase 2d-sync): unconditionally pin the target
          // loader to the target location on commit. Idempotent in regular-decant
          // case (loader already at target location); performs the actual
          // relocation in whole-loader-mode case. No-op on cancel-transfer.
          if (item.targetLoaderId && item.targetLocationId) {
            await manager
              .getRepository(LoadersEntityClass)
              .update({ id: item.targetLoaderId }, {
                locationId: item.targetLocationId,
              } as DeepPartial<LoadersEntityClass>);
          }
        }),
      );

      return true;
    });
  }
}
