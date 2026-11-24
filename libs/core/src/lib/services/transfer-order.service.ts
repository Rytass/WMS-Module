import { ConflictException, Inject, Injectable } from '@nestjs/common';
import {
  ConsumptionOrderItemEntityClass,
  LoadersEntityClass,
  LocationEntityClass,
  ReceiveInventoryOrderItemEntityClass,
  ShipInventoryOrderItemEntityClass,
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
  IsNull,
  Repository,
} from 'typeorm';
import { StockStatus } from '../constants/stock-status';
import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import { HelperService } from './helper.service';
import {
  CreateTransferOrderInput,
  UpdateTransferOrderInput,
} from '../typings/create-transfer-order.input';
import {
  FindTransferOrderInput,
  TransferOrderSortField,
} from '../typings/find-transfer-order.input';
import { SortOrder } from '../typings/list-sort';
import { applyListSort } from '../utils/list-sort';
import { TransferOrderInput } from '../typings/transfer-order.input';
import { CancelTransferOrderInput } from '../typings/cancel-transfer-order.input';
import { MaterialService } from './material.service';
import { BatchService } from './batch.service';
import { StockService } from './stock.service';
import { ConsumptionOrderService } from './consumption-order.service';
import { assertLocationsNotCounting } from '../events/inventory-count-lock.subscriber';
import { MoveLoaderInput } from '../typings/move-loader.input';
import type { LoaderSlot } from '../typings/aggregated-stock';
import { sumShipChanges } from '../utils/ship-change-quantities';
import { WmsEntities } from '../models/wms-entities';
import { quotedTablePathOf } from '../utils/table-path';
import {
  assertPositiveQuantity,
  assertPositiveQuantityIfPresent,
} from '../utils/assert-positive-quantity';
import { runInTransaction } from '../utils/run-in-transaction';
import { TransferChangeKind } from '../constants/transfer-change-kind';
import { sumTransferChanges } from '../utils/transfer-change-quantities';
import { assertChangesHaveKind } from '../utils/assert-change-kinds';
import {
  addQuantity,
  compareQuantity,
  fromBaseQuantity,
  isNegativeQuantity,
  isPositiveQuantity,
  negateQuantity,
  quantitiesEqual,
  subtractQuantity,
  sumQuantities,
  toBaseQuantity,
} from '../utils/quantity';

const TRANSFER_ORDER_SORT_FIELDS: Readonly<
  Record<TransferOrderSortField, string>
> = {
  [TransferOrderSortField.KEY]: 'to.key',
  [TransferOrderSortField.RECEIVER]: 'to.receiver',
  [TransferOrderSortField.DESCRIPTION]: 'to.description',
  [TransferOrderSortField.CREATED_BY]: 'to.createdBy',
  [TransferOrderSortField.CREATED_AT]: 'to.createdAt',
};

const transferredAndCancelled = (
  changes: TransferOrderItemEntityClass['changes'],
): number => {
  const { transferred, cancelled } = sumTransferChanges(changes);

  return addQuantity(transferred, cancelled);
};

/**
 * What an item still has reserved and not yet executed, in base units.
 *
 * An item's change rows are one reservation row written up front (`+target`,
 * kind RESERVE) and one negative row per execution (TRANSFER) or cancellation
 * (CANCEL). The pending quantity is therefore the target less what was
 * executed and what was cancelled. Summing every row instead -- what cancel
 * and remove used to do -- counts the reservation row against itself and
 * yields the quantity already *executed*: zero straight after reservation, so
 * a reservation that never executed could be neither cancelled nor released
 * (#183).
 */
const pendingBaseQuantity = (
  item: Pick<
    TransferOrderItemEntityClass,
    'id' | 'targetTransferredQuantity' | 'changes'
  >,
  conversionFactor: number,
): number => {
  // Every caller goes on to write the ledger, so a row without a kind is refused.
  assertChangesHaveKind(item.id, item.changes);

  return subtractQuantity(
    toBaseQuantity(item.targetTransferredQuantity, conversionFactor),
    transferredAndCancelled(item.changes),
  );
};

@Injectable()
export class TransferOrderService<
  T extends TransferOrderEntityClass = TransferOrderEntityClass,
  K extends TransferOrderItemEntityClass = TransferOrderItemEntityClass,
> {
  private readonly seqPrefix = 'TO';
  readonly transferOrderRepository: Repository<T>;
  constructor(
    private readonly dataSource: DataSource,
    private readonly entities: WmsEntities,
    private readonly helperService: HelperService,
    private readonly materialService: MaterialService,
    private readonly batchService: BatchService,
    private readonly stockService: StockService,
    private readonly consumptionOrderService: ConsumptionOrderService,
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
      order: manager.getRepository(this.entities.order),
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
    // One item at a time. Run concurrently, two items of one batch both split
    // before either saved (two in-transfer children, #186), and two items
    // drawing on one stock row both passed the availability check before either
    // deducted.
    // Every (material, batch) this call deducts from, locked up front in a
    // fixed order so overlapping operations cannot deadlock each other.
    await this.stockService.lockStockSlots(items, manager);
    for (const data of items) {
      // Ensure required fields are present
      if (!data.batchId || !data.materialId) continue;

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
        manager,
      );

      await repos.transferOrderChange.save(
        repos.transferOrderChange.create({
          itemId: item.id,
          id: base.id,
          quantityChanged: toBaseQuantity(
            item.targetTransferredQuantity,
            conversionFactor,
          ),
          kind: TransferChangeKind.RESERVE,
        }),
      );

      // Stock movements track the transfer through splitted batch
      await this.stockService.validateStockAvailability(
        {
          materialId: item.materialId,
          batchId: item.batchId,
          locationId: this.stockService.resolveLocationId(item.locationId),
          loaderId: this.stockService.resolveLoaderId(item.loaderId),
          quantity: toBaseQuantity(
            item.targetTransferredQuantity,
            conversionFactor,
          ),
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
            quantity: negateQuantity(
              toBaseQuantity(item.targetTransferredQuantity, conversionFactor),
            ),
          } as DeepPartial<StockEntityClass>,
          // add to splitted batch in transfer state
          {
            orderId: base.id,
            materialId: item.materialId,
            batchId: splittedBatch.id, // splitted batch marked inTransfer
            locationId: this.stockService.resolveLocationId(item.locationId),
            loaderId: this.stockService.resolveLoaderId(item.loaderId),
            quantity: toBaseQuantity(
              item.targetTransferredQuantity,
              conversionFactor,
            ),
          } as DeepPartial<StockEntityClass>,
        ]),
      );
    }
  }

  async cancelTransfer(
    options: CancelTransferOrderInput[] | CancelTransferOrderInput,
    manager?: EntityManager,
  ): Promise<boolean> {
    if (!Array.isArray(options)) options = [options];
    // Absent quantity cancels everything pending; a given one must be positive
    // (zero or negative used to return `true` and do nothing). Checked here and
    // not in the internal method, which `removeTransferOrder` calls too.
    options.forEach((option) =>
      assertPositiveQuantityIfPresent(
        option.quantity ?? undefined,
        'quantity',
        `item ${option.itemId}`,
      ),
    );
    return runInTransaction(
      this.dataSource,
      manager,
      async (transactionManager) => {
        await this.cancelTransferInternal(options, transactionManager);
        return true;
      },
    );
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
      relations: { changes: true },
    });

    const itemMap = new Map(items.map((item) => [item.id, item]));

    // Source (material, batch) locks first, in a fixed order, before any

    // batch-group lock a split takes -- the same order every path uses.

    await this.stockService.lockStockSlots(items, manager);

    // Whole-loader transfer cancel validation (Phase 2d-sync).
    // For each whole-loader item in the REQUEST, the cancel qty must equal the
    // item's pending quantity (target minus what was executed or cancelled). Partial cancel of a
    // whole-loader item is forbidden — they cancel atomically or not at all.
    // Decant items in the same order can be partially cancelled independently.
    for (const option of options) {
      const item = itemMap.get(option.itemId);
      if (!item || !item.loaderId || !item.targetLoaderId) continue;
      if (item.loaderId !== item.targetLoaderId) continue; // not whole-loader
      const factor = await this.materialService.getConversionFactor(
        item.materialId,
        item.unitId || undefined,
        manager,
      );
      const remainingBase = pendingBaseQuantity(item, factor);
      const cancelQtyBase =
        option.quantity != null
          ? toBaseQuantity(option.quantity, factor)
          : remainingBase;
      if (!quantitiesEqual(cancelQtyBase, remainingBase)) {
        throw new Error(
          `Whole-loader item must be cancelled atomically (item=${item.id}, thisCall=${cancelQtyBase}, remaining=${remainingBase})`,
        );
      }
    }

    for (const option of options) {
      await (async () => {
        const item = itemMap.get(option.itemId);
        if (!item) return;

        const conversionFactor = await this.materialService.getConversionFactor(
          item.materialId,
          item.unitId || undefined,
          manager,
        );

        const remainingQuantity = pendingBaseQuantity(item, conversionFactor);

        // If quantity not provided, cancel all remaining cancellable quantity
        const cancelQuantity =
          option.quantity != null
            ? toBaseQuantity(option.quantity, conversionFactor)
            : remainingQuantity;

        if (
          isNegativeQuantity(
            subtractQuantity(remainingQuantity, cancelQuantity),
          )
        ) {
          throw new Error(
            `Cancel quantity exceeds pending transfer for item ${option.itemId}`,
          );
        }

        if (!isPositiveQuantity(cancelQuantity)) return;

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
              quantityChanged: negateQuantity(cancelQuantity),
              kind: TransferChangeKind.CANCEL,
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
                quantity: negateQuantity(cancelQuantity),
              } as DeepPartial<StockEntityClass>,
            ]),
          ),
        ]);
      })();
    }
  }

  /**
   * Remove a transfer order
   * Automatically cancels all remaining pending transfers to release stock
   */
  async removeTransferOrder(
    id: string,
    outerManager?: EntityManager,
  ): Promise<boolean> {
    return runInTransaction(this.dataSource, outerManager, async (manager) => {
      const repos = this.getRepositories(manager);

      // Find order
      const order = await repos.transferOrder.findOne({ where: { id } });
      if (!order || order.removedAt) return false;

      // Find all items with changes to calculate cancellable quantities
      const items = await repos.transferOrderItem.find({
        where: { orderId: id },
        relations: { changes: true },
      });

      // Build cancel inputs for items with remaining pending quantity
      const cancelInputs: CancelTransferOrderInput[] = [];
      for (const item of items) {
        const conversionFactor = await this.materialService.getConversionFactor(
          item.materialId,
          item.unitId || undefined,
          manager,
        );

        const remainingQuantity = pendingBaseQuantity(item, conversionFactor);

        if (isPositiveQuantity(remainingQuantity)) {
          // Use base quantity (without conversion) since cancelTransferInternal will apply conversion
          cancelInputs.push({
            itemId: item.id,
            quantity: fromBaseQuantity(remainingQuantity, conversionFactor),
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
    outerManager?: EntityManager,
  ): Promise<T> {
    return runInTransaction(this.dataSource, outerManager, (manager) =>
      this.createTransferOrderInternal(options, manager),
    );
  }

  private async createTransferOrderInternal(
    options: CreateTransferOrderInput,
    manager: EntityManager,
  ): Promise<T> {
    const repos = this.getRepositories(manager);
    const { items, ...orderOptions } = options;

    items?.forEach((item, index) =>
      assertPositiveQuantity(
        item.targetTransferredQuantity,
        'targetTransferredQuantity',
        `item #${index}`,
      ),
    );

    // The header loader is read by the gates below and by the placement check;
    // lock its row first (loader locks precede every stock lock) so a concurrent
    // move of it cannot slip between the read and the writes.
    if (options.loaderId && items?.length) {
      await this.stockService.lockLoaders([options.loaderId], manager);
    }

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
        const [aggRows] = await this.stockService.findAggregatedStocks(
          { loaderId: srcLoaderId },
          manager,
        );
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
        const loaderTotalQty = sumQuantities(aggRows.map((r) => r.quantity));
        const subTotals: number[] = [];
        for (const item of items) {
          if (item.loaderId === srcLoaderId) {
            // Runtime callers augment items with materialId/batchId/unitId beyond
            // the public CreateTransferOrderItemInput shape (see processTransferOrderItems
            // which expects Partial<TransferOrderItemEntityClass>); access via cast.
            const itemFull = item as Partial<TransferOrderItemEntityClass> &
              typeof item;
            if (!itemFull.materialId) continue;
            const factor = await this.materialService.getConversionFactor(
              itemFull.materialId,
              itemFull.unitId || undefined,
              manager,
            );
            subTotals.push(
              toBaseQuantity(item.targetTransferredQuantity, factor),
            );
          }
        }
        const subTotalQty = sumQuantities(subTotals);
        if (!quantitiesEqual(subTotalQty, loaderTotalQty)) {
          throw new Error(
            `Whole-loader transfer must reserve entire loader qty for loader ${srcLoaderId} (requested=${subTotalQty}, loaderTotal=${loaderTotalQty})`,
          );
        }
      }
    }

    // Consolidating onto a loader that is somewhere else would split the loader
    // from its stock (#222). Refuse before anything is written; whole-loader
    // items move their own loader and are exempt.
    // A header loader that is itself the whole-loader source of an item in
    // this order is being moved by that item; the order's priority rule
    // (whole-loader items execute first) makes it sit at the target by the
    // time the consolidating items run, and `transfer()` checks again then.
    const headerLoaderMovesWithOrder = !!items?.some(
      (item) => item.loaderId === options.loaderId,
    );

    if (
      options.loaderId &&
      options.locationId &&
      !headerLoaderMovesWithOrder &&
      items?.some((item) => item.loaderId !== options.loaderId)
    ) {
      await this.stockService.resolveLoaderPlacement(
        options.loaderId,
        options.locationId,
        manager,
      );
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

  /**
   * Move a loader, and everything on it, to another location (#225).
   *
   * Not a transfer in the reserve-then-execute sense. A whole-loader transfer
   * splits every batch into a `transferId` child, which drops the flags the
   * stock carries -- an `inShipment`, `held` or allocated batch cannot survive
   * it, and a shipment's source is found by the item's location and the batch's
   * flags, so shipping after such a move finds nothing. Here every batch keeps
   * its id and its flags: each slot the loader holds is written out of the old
   * location and into the new one, as a pair of stock rows under one change row.
   *
   * It is recorded as what it is -- a whole-loader transfer order, created and
   * executed in one go -- so the three things that key off a change row work
   * unchanged: the inventory count lock, the `stock.transferred` event and the
   * change log's `TRANSFERRED`. There is no RESERVE row, so nothing is left
   * pending on the order.
   *
   * Lines that still have work to do and name this loader are re-pointed at the
   * new location in the same transaction, because the operations that finish
   * them read the location off the line:
   *
   * - ship (`ship`, `cancelShip`) and transfer (`transfer`, `cancelTransfer`):
   *   `locationId`;
   * - receive (`receive`): `locationId`, while something is left to receive;
   * - consumption (`issue`, `return`, `settle`): `locationId` where the loader
   *   is the source, `targetLocationId` where it is the consuming loader.
   *
   * Lines already finished are history and stay as they were. Hold, allocate,
   * vendor, customer, scrape, quality inspection, split, merge, reclassify and
   * count lines are records of a movement that was written in full when they
   * were created; nothing reads their location afterwards (a release or return
   * takes its location from its own input), so they are left alone.
   *
   * Refused, before anything is written: the default loader (it stands for
   * "no loader" and holds the warehouse's unloadered stock), a loader already at
   * the target, a loader with no stock (relocate it with
   * `LoaderService.updateLoader`), an unknown loader or location, and any source
   * or target location a running count has locked.
   */
  async moveLoader(
    options: MoveLoaderInput,
    outerManager?: EntityManager,
  ): Promise<T> {
    return runInTransaction(this.dataSource, outerManager, (manager) =>
      this.moveLoaderInternal(options, manager),
    );
  }

  private async moveLoaderInternal(
    { loaderId, targetLocationId, description, createdBy }: MoveLoaderInput,
    manager: EntityManager,
  ): Promise<T> {
    if (loaderId === this.stockService.defaultLoaderId) {
      throw new Error(
        'The default loader stands for stock without a loader and cannot be moved',
      );
    }

    // Loader row first: where a loader sits is read and then acted on, and the
    // lock order is loader rows -> stock slots -> batch group.
    await this.stockService.lockLoaders([loaderId], manager);

    const loader = await manager
      .getRepository(LoadersEntityClass)
      .findOneBy({ id: loaderId });

    if (!loader) {
      throw new Error(`Loader ${loaderId} does not exist`);
    }

    const target = await manager
      .getRepository<LocationEntityClass>(this.entities.location)
      .findOneBy({ id: targetLocationId });

    if (!target) {
      throw new Error(`Location ${targetLocationId} does not exist`);
    }

    if (loader.locationId === targetLocationId) {
      throw new Error(
        `Loader ${loaderId} is already at location ${targetLocationId}`,
      );
    }

    const firstRead = await this.stockService.findLoaderSlots(
      loaderId,
      manager,
    );

    if (firstRead.length === 0) {
      throw new Error(
        `Loader ${loaderId} holds no stock, so there is nothing to move; relocate an empty loader with LoaderService.updateLoader`,
      );
    }

    // Refused up front rather than at the first change row: a host may catch
    // the refusal and carry on in its transaction, and by then the order and
    // item rows written ahead of that row would be sitting in it.
    await assertLocationsNotCounting(manager, this.dataSource, [
      ...new Set([
        ...firstRead.map((slot) => slot.locationId),
        targetLocationId,
      ]),
    ]);

    await this.stockService.lockStockSlots(firstRead, manager);

    // What the loader holds is read again now that its slots are locked: a
    // reservation does not take the loader's row, so the first read can already
    // be stale. A slot that appeared meanwhile is not locked, and locking it now
    // would take stock locks out of order; the caller retries instead.
    const slots = await this.stockService.findLoaderSlots(loaderId, manager);
    const locked = new Set(
      firstRead.map((slot) => `${slot.materialId}:${slot.batchId}`),
    );

    if (
      slots.length === 0 ||
      slots.some((slot) => !locked.has(`${slot.materialId}:${slot.batchId}`))
    ) {
      throw new ConflictException(
        `Loader ${loaderId} changed while it was being moved; retry`,
      );
    }

    slots.forEach((slot) => {
      if (!isPositiveQuantity(slot.quantity)) {
        throw new Error(
          `Loader ${loaderId} holds ${slot.quantity} of batch ${slot.batchId} at ${slot.locationId}; a negative slot cannot be moved`,
        );
      }
    });

    const repos = this.getRepositories(manager);
    const key = await this.helperService.getSeq(this.seqPrefix, manager);
    const order = await repos.transferOrder.save(
      repos.transferOrder.create({
        key,
        description: description ?? null,
        createdBy: createdBy ?? null,
      } as DeepPartial<TransferOrderEntityClass>),
    );

    for (const slot of slots) {
      await this.writeLoaderMove(
        order.id,
        loaderId,
        targetLocationId,
        slot,
        repos,
      );
    }

    await this.followLoader(loaderId, targetLocationId, order.id, manager);

    await repos.loader.update({ id: loaderId }, {
      locationId: targetLocationId,
    } as DeepPartial<LoadersEntityClass>);

    return order as T;
  }

  /**
   * One slot of the move: its item, one change row (kind TRANSFER, negative like
   * every executed transfer) and the stock pair, out of the slot's location and
   * into the target on the same loader and the same batch.
   */
  private async writeLoaderMove(
    orderId: string,
    loaderId: string,
    targetLocationId: string,
    slot: LoaderSlot,
    repos: ReturnType<typeof this.getRepositories>,
  ): Promise<void> {
    // Both ends on the item: the count lock reads `locationId` and
    // `targetLocationId` off it.
    const item = await repos.transferOrderItem.save(
      repos.transferOrderItem.create({
        orderId,
        materialId: slot.materialId,
        batchId: slot.batchId,
        locationId: slot.locationId,
        loaderId,
        unitId: null,
        targetTransferredQuantity: slot.quantity,
        targetLocationId,
        targetLoaderId: loaderId,
      } as DeepPartial<TransferOrderItemEntityClass>),
    );
    const base = await repos.order.save({});

    await repos.transferOrderChange.save(
      repos.transferOrderChange.create({
        itemId: item.id,
        id: base.id,
        quantityChanged: negateQuantity(slot.quantity),
        kind: TransferChangeKind.TRANSFER,
      }),
    );

    await repos.stock.save(
      repos.stock.create([
        {
          orderId: base.id,
          materialId: slot.materialId,
          batchId: slot.batchId,
          locationId: slot.locationId,
          loaderId,
          quantity: negateQuantity(slot.quantity),
        } as DeepPartial<StockEntityClass>,
        {
          orderId: base.id,
          materialId: slot.materialId,
          batchId: slot.batchId,
          locationId: targetLocationId,
          loaderId,
          quantity: slot.quantity,
        } as DeepPartial<StockEntityClass>,
      ]),
    );
  }

  /**
   * Re-point the unfinished lines that name `loaderId` at `locationId`. See
   * `moveLoader` for which tables, and why not the others.
   */
  private async followLoader(
    loaderId: string,
    locationId: string,
    exceptOrderId: string,
    manager: EntityManager,
  ): Promise<void> {
    const shipRepository =
      manager.getRepository<ShipInventoryOrderItemEntityClass>(
        ShipInventoryOrderItemEntityClass,
      );
    const pendingShipIds = (
      await shipRepository.find({
        where: { loaderId, removedAt: IsNull() },
        relations: { changes: true },
      })
    )
      .filter((item) => {
        assertChangesHaveKind(item.id, item.changes);
        const { reserved, shipped, cancelled } = sumShipChanges(item.changes);

        return isPositiveQuantity(
          subtractQuantity(subtractQuantity(reserved, shipped), cancelled),
        );
      })
      .map(({ id }) => id);

    if (pendingShipIds.length) {
      await shipRepository.update({ id: In(pendingShipIds) }, {
        locationId,
      } as DeepPartial<ShipInventoryOrderItemEntityClass>);
    }

    const transferRepository =
      manager.getRepository<TransferOrderItemEntityClass>(
        this.transferOrderItemEntity,
      );
    const transferItems = await transferRepository.find({
      where: { loaderId, removedAt: IsNull() },
      relations: { changes: true },
    });
    const pendingTransferIds: string[] = [];

    for (const item of transferItems) {
      if (item.orderId === exceptOrderId) continue;

      const factor = await this.materialService.getConversionFactor(
        item.materialId,
        item.unitId || undefined,
        manager,
      );

      if (isPositiveQuantity(pendingBaseQuantity(item, factor))) {
        pendingTransferIds.push(item.id);
      }
    }

    if (pendingTransferIds.length) {
      await transferRepository.update({ id: In(pendingTransferIds) }, {
        locationId,
      } as DeepPartial<TransferOrderItemEntityClass>);
    }

    const receiveRepository =
      manager.getRepository<ReceiveInventoryOrderItemEntityClass>(
        ReceiveInventoryOrderItemEntityClass,
      );
    const receiveItems = await receiveRepository.find({
      where: { loaderId, removedAt: IsNull() },
      relations: { changes: true },
    });
    const pendingReceiveIds: string[] = [];

    for (const item of receiveItems) {
      const factor = await this.materialService.getConversionFactor(
        item.materialId,
        item.unitId || undefined,
        manager,
      );
      const received = sumQuantities(
        item.changes.map((change) => change.quantityChanged),
      );

      if (
        isPositiveQuantity(
          subtractQuantity(
            toBaseQuantity(item.targetReceivedQuantity, factor),
            received,
          ),
        )
      ) {
        pendingReceiveIds.push(item.id);
      }
    }

    if (pendingReceiveIds.length) {
      await receiveRepository.update({ id: In(pendingReceiveIds) }, {
        locationId,
      } as DeepPartial<ReceiveInventoryOrderItemEntityClass>);
    }

    const consumptionRepository =
      manager.getRepository<ConsumptionOrderItemEntityClass>(
        ConsumptionOrderItemEntityClass,
      );
    const consumptionItems = await consumptionRepository.find({
      where: [
        { loaderId, removedAt: IsNull() },
        { targetLoaderId: loaderId, removedAt: IsNull() },
      ],
    });
    const progress = new Map(
      (
        await Promise.all(
          [...new Set(consumptionItems.map(({ orderId }) => orderId))].map(
            (orderId) =>
              this.consumptionOrderService.getProgress(orderId, manager),
          ),
        )
      )
        .flat()
        .map((entry) => [entry.itemId, entry] as const),
    );

    for (const item of consumptionItems) {
      const state = progress.get(item.id);

      // Open: something left to issue, or something out that has not come back
      // or been used up.
      const open =
        !!state &&
        (isPositiveQuantity(subtractQuantity(state.target, state.issued)) ||
          isPositiveQuantity(state.outstanding));

      if (!open) continue;

      await consumptionRepository.update({ id: item.id }, {
        ...(item.loaderId === loaderId ? { locationId } : {}),
        ...(item.targetLoaderId === loaderId
          ? { targetLocationId: locationId }
          : {}),
      } as DeepPartial<ConsumptionOrderItemEntityClass>);
    }
  }

  async updateTransferOrder({
    manager: outerManager,
    ...input
  }: UpdateTransferOrderInput & { manager?: EntityManager }): Promise<T> {
    return runInTransaction(this.dataSource, outerManager, (manager) =>
      this.updateTransferOrderInternal(input, manager),
    );
  }

  private async updateTransferOrderInternal(
    { id, ...options }: UpdateTransferOrderInput,
    manager: EntityManager,
  ): Promise<T> {
    const repos = this.getRepositories(manager);
    const { items, ...orderOptions } = options;

    // The set checked is the set processed below: every line that is not
    // removed. A new line must state a quantity; an existing one may leave it
    // alone but cannot set it to something unusable.
    items
      ?.filter((item) => !item.removedAt)
      .forEach((item, index) =>
        item.id
          ? assertPositiveQuantityIfPresent(
              item.targetTransferredQuantity,
              'targetTransferredQuantity',
              `item ${item.id}`,
            )
          : assertPositiveQuantity(
              item.targetTransferredQuantity,
              'targetTransferredQuantity',
              `item #${index}`,
            ),
      );

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

  async findMany(options: FindTransferOrderInput): Promise<[T[], number]> {
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
          SELECT 1 FROM ${quotedTablePathOf(this.dataSource, this.transferOrderItemEntity)} to_mat_items
          INNER JOIN ${quotedTablePathOf(this.dataSource, this.entities.material)} to_mat ON to_mat.id = to_mat_items."materialId"
          WHERE to_mat_items."orderId" = to.id
          AND to_mat.key ILIKE :materialKey
        )`,
        { materialKey: `%${options.materialKey}%` },
      );

    if (options.batchKey)
      queryBuilder.andWhere(
        `EXISTS (
          SELECT 1 FROM ${quotedTablePathOf(this.dataSource, this.transferOrderItemEntity)} to_batch_items
          INNER JOIN ${quotedTablePathOf(this.dataSource, this.entities.batch)} to_batch ON to_batch.id = to_batch_items."batchId"
          WHERE to_batch_items."orderId" = to.id
          AND to_batch.key ILIKE :batchKey
        )`,
        { batchKey: `%${options.batchKey}%` },
      );

    if (options.locationKey)
      queryBuilder.andWhere(
        `EXISTS (
          SELECT 1 FROM ${quotedTablePathOf(this.dataSource, this.transferOrderItemEntity)} to_loc_items
          INNER JOIN ${quotedTablePathOf(this.dataSource, this.entities.location)} to_loc ON to_loc.id = to_loc_items."locationId"
          WHERE to_loc_items."orderId" = to.id
          AND to_loc.key ILIKE :locationKey
        )`,
        { locationKey: `%${options.locationKey}%` },
      );

    if (options.loaderKey)
      queryBuilder.andWhere(
        `EXISTS (
          SELECT 1 FROM ${quotedTablePathOf(this.dataSource, this.transferOrderItemEntity)} to_ldr_items
          INNER JOIN ${quotedTablePathOf(this.dataSource, LoadersEntityClass)} to_ldr ON to_ldr.id = to_ldr_items."loaderId"
          WHERE to_ldr_items."orderId" = to.id
          AND to_ldr."serialId" ILIKE :loaderKey
        )`,
        { loaderKey: `%${options.loaderKey}%` },
      );

    if (options.targetLocationKey)
      queryBuilder.andWhere(
        `EXISTS (
          SELECT 1 FROM ${quotedTablePathOf(this.dataSource, this.transferOrderItemEntity)} to_tgt_loc_items
          INNER JOIN ${quotedTablePathOf(this.dataSource, this.entities.location)} to_tgt_loc ON to_tgt_loc.id = to_tgt_loc_items."targetLocationId"
          WHERE to_tgt_loc_items."orderId" = to.id
          AND to_tgt_loc.key ILIKE :targetLocationKey
        )`,
        { targetLocationKey: `%${options.targetLocationKey}%` },
      );

    if (options.targetLoaderKey)
      queryBuilder.andWhere(
        `EXISTS (
          SELECT 1 FROM ${quotedTablePathOf(this.dataSource, this.transferOrderItemEntity)} to_tgt_ldr_items
          INNER JOIN ${quotedTablePathOf(this.dataSource, LoadersEntityClass)} to_tgt_ldr ON to_tgt_ldr.id = to_tgt_ldr_items."targetLoaderId"
          WHERE to_tgt_ldr_items."orderId" = to.id
          AND to_tgt_ldr."serialId" ILIKE :targetLoaderKey
        )`,
        { targetLoaderKey: `%${options.targetLoaderKey}%` },
      );

    applyListSort(queryBuilder, {
      sort: options.sort,
      fields: TRANSFER_ORDER_SORT_FIELDS,
      defaultOrder: {
        field: TransferOrderSortField.CREATED_AT,
        order: SortOrder.DESC,
      },
      tiebreaker: 'to.id',
    });

    if (options.offset !== undefined && options.offset >= 0)
      queryBuilder.skip(options.offset);

    if (options.limit !== undefined && options.limit > 0)
      queryBuilder.take(options.limit);

    return queryBuilder.getManyAndCount();
  }

  transfer(
    options: TransferOrderInput[] | TransferOrderInput,
    outerManager?: EntityManager,
  ): Promise<boolean> {
    if (!Array.isArray(options)) options = [options];
    return runInTransaction(this.dataSource, outerManager, async (manager) => {
      options.forEach((option) =>
        assertPositiveQuantity(
          option.quantity,
          'quantity',
          `item ${option.itemId}`,
        ),
      );

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
        relations: { changes: true },
      });

      const itemMap = new Map(items.map((item) => [item.id, item]));

      // Every loader this call reads the location of or moves, locked before
      // any stock lock (see `StockService.lockLoaders`).
      await this.stockService.lockLoaders(
        items.flatMap((item) =>
          item.loaderId && item.loaderId === item.targetLoaderId
            ? [item.loaderId]
            : item.targetLoaderId && item.targetLocationId
              ? [item.targetLoaderId]
              : [],
        ),
        manager,
      );

      // Source (material, batch) locks first, in a fixed order, before any

      // batch-group lock a split takes -- the same order every path uses.

      await this.stockService.lockStockSlots(items, manager);
      const inputMap = new Map(options.map((o) => [o.itemId, o]));

      // Whole-loader transfer commit validation (Phase 2d-sync).
      //
      // Priority rule: for each whole-loader item in the ORDER, it must be either
      //   (a) already fully transferred (alreadyTransferred >= target), or
      //   (b) being fully transferred in this request (alreadyTransferred + input.qty == target)
      // Otherwise reject — whole-loader items must be 100% committed before any other
      // items in the same order can commit. Prevents the unconditional loader UPDATE
      // from moving the target loader prematurely (which would orphan stocks).
      //
      // Plus the per-loader sum check: for whole-loader-mode inputs in this request,
      // toBaseQuantity(sum.input.quantity, factor) must equal loaderTotalQty (catches the
      // receive-onto-moving-loader scenario where loaderTotalQty drifts > sum).
      const orderIds = new Set<string>();
      for (const item of items) orderIds.add(item.orderId);
      if (orderIds.size > 1) {
        throw new Error(
          'Transfer request spans multiple orders, which is not supported',
        );
      }
      const orderId = orderIds.size === 1 ? [...orderIds][0] : null;
      if (orderId) {
        const allOrderItems = await itemRepository.find({
          where: { orderId },
          relations: { changes: true },
        });
        for (const orderItem of allOrderItems) {
          if (orderItem.removedAt) continue;
          if (!orderItem.loaderId || !orderItem.targetLoaderId) continue;
          if (orderItem.loaderId !== orderItem.targetLoaderId) continue;
          // Whole-loader item — apply priority rule.
          const factor = await this.materialService.getConversionFactor(
            orderItem.materialId,
            orderItem.unitId || undefined,
            manager,
          );
          const targetBase = toBaseQuantity(
            orderItem.targetTransferredQuantity,
            factor,
          );
          assertChangesHaveKind(orderItem.id, orderItem.changes);
          const alreadyTransferred = transferredAndCancelled(orderItem.changes);
          if (compareQuantity(alreadyTransferred, targetBase) >= 0) continue; // already fully transferred (committed or cancelled)
          const inputOpt = inputMap.get(orderItem.id);
          if (inputOpt) {
            const inputBase = toBaseQuantity(inputOpt.quantity, factor);
            if (
              quantitiesEqual(
                addQuantity(alreadyTransferred, inputBase),
                targetBase,
              )
            )
              continue; // this request completes it
          }
          throw new Error(
            `Whole-loader item must be fully transferred first (item=${orderItem.id}, target=${targetBase}, alreadyTransferred=${alreadyTransferred})`,
          );
        }
      }

      // Per-loader sum check (catches receive-onto-moving-loader orphan W08).
      const wholeLoaderGroupSums = new Map<string, number>();
      for (const option of options) {
        const item = itemMap.get(option.itemId);
        if (!item || !item.loaderId) continue;
        if (item.loaderId === item.targetLoaderId) {
          const factor = await this.materialService.getConversionFactor(
            item.materialId,
            item.unitId || undefined,
            manager,
          );
          wholeLoaderGroupSums.set(
            item.loaderId,
            addQuantity(
              wholeLoaderGroupSums.get(item.loaderId) ?? 0,
              toBaseQuantity(option.quantity, factor),
            ),
          );
        }
      }
      for (const [srcLoaderId, subTotalQty] of wholeLoaderGroupSums) {
        const [aggRows] = await this.stockService.findAggregatedStocks(
          { loaderId: srcLoaderId },
          manager,
        );
        const loaderTotalQty = sumQuantities(aggRows.map((r) => r.quantity));
        if (!quantitiesEqual(subTotalQty, loaderTotalQty)) {
          throw new Error(
            `Whole-loader transfer must execute 100% qty (loader=${srcLoaderId}, thisRequest=${subTotalQty}, loaderTotal=${loaderTotalQty})`,
          );
        }
      }

      // A whole-loader item moves the loader, which every consolidation onto
      // it then has to find already in place: run those first.
      const isWholeLoaderOption = (option: TransferOrderInput): boolean => {
        const item = itemMap.get(option.itemId);
        return !!item?.loaderId && item.loaderId === item.targetLoaderId;
      };

      for (const option of [
        ...options.filter(isWholeLoaderOption),
        ...options.filter((option) => !isWholeLoaderOption(option)),
      ]) {
        await (async () => {
          const item = itemMap.get(option.itemId);
          if (!item) return;

          const conversionFactor =
            await this.materialService.getConversionFactor(
              item.materialId,
              item.unitId || undefined,
              manager,
            );

          const remainingQuantity = pendingBaseQuantity(item, conversionFactor);

          if (
            isNegativeQuantity(
              subtractQuantity(
                remainingQuantity,
                toBaseQuantity(option.quantity, conversionFactor),
              ),
            )
          )
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
          const base = await manager
            .getRepository(this.entities.order)
            .save({});

          // Availability check at the IN_TRANSFER coord — must have ≥ qty to drain
          await this.stockService.validateStockAvailability(
            {
              materialId: item.materialId,
              batchId: inTransferBatch.id,
              locationId: this.stockService.resolveLocationId(item.locationId),
              loaderId: this.stockService.resolveLoaderId(item.loaderId),
              quantity: toBaseQuantity(option.quantity, conversionFactor),
            },
            manager,
          );

          // Consolidating onto a loader (not a whole-loader move) never drags
          // the loader away from stock it already holds; decided before this
          // call's own rows land on it, so "empty" means empty before it.
          const isWholeLoader =
            !!item.loaderId && item.loaderId === item.targetLoaderId;
          const relocateTargetLoader =
            !isWholeLoader && item.targetLoaderId && item.targetLocationId
              ? (await this.stockService.resolveLoaderPlacement(
                  item.targetLoaderId,
                  item.targetLocationId,
                  manager,
                )) === 'relocate'
              : false;

          await Promise.all([
            changeRepository.save(
              changeRepository.create({
                itemId: item.id,
                id: base.id,
                quantityChanged: negateQuantity(
                  toBaseQuantity(option.quantity, conversionFactor),
                ),
                kind: TransferChangeKind.TRANSFER,
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
                  quantity: toBaseQuantity(option.quantity, conversionFactor),
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
                  quantity: negateQuantity(
                    toBaseQuantity(option.quantity, conversionFactor),
                  ),
                } as DeepPartial<StockEntityClass>,
              ]),
            ),
          ]);

          // Whole-loader transfer (Phase 2d-sync): pin the target loader to the
          // target location on commit. Only a whole-loader item (or an empty
          // loader `relocateEmptyLoaders` allows) moves it; any other loader
          // already sits where its stock is. No-op on cancel-transfer.
          if (
            item.targetLoaderId &&
            item.targetLocationId &&
            (isWholeLoader || relocateTargetLoader)
          ) {
            await manager
              .getRepository(LoadersEntityClass)
              .update({ id: item.targetLoaderId }, {
                locationId: item.targetLocationId,
              } as DeepPartial<LoadersEntityClass>);
          }
        })();
      }

      return true;
    });
  }
}
