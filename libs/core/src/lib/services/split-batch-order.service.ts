import { Inject, Injectable } from '@nestjs/common';
import {
  SplitBatchOrderChangeEntityClass,
  SplitBatchOrderEntity,
  SplitBatchOrderEntityClass,
  SplitBatchOrderItemEntity,
  SplitBatchOrderItemEntityClass,
  StockEntityClass,
  BatchEntityClass,
} from '../models';
import { DataSource, DeepPartial, EntityManager, EntityTarget } from 'typeorm';
import { SplitBatchInput } from '../typings/split-batch.input';
import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import { MaterialService } from './material.service';
import { BatchService } from './batch.service';
import { HelperService } from './helper.service';
import { StockService } from './stock.service';
import { runInTransaction } from '../utils/run-in-transaction';
import { WmsEntities } from '../models/wms-entities';

@Injectable()
export class SplitBatchOrderService<
  T extends SplitBatchOrderEntityClass = SplitBatchOrderEntityClass,
  K extends SplitBatchOrderItemEntityClass = SplitBatchOrderItemEntityClass,
> {
  private readonly seqPrefix = 'SBO';
  constructor(
    private readonly dataSource: DataSource,
    private readonly entities: WmsEntities,
    private readonly materialService: MaterialService,
    private readonly batchService: BatchService,
    private readonly helperService: HelperService,
    private readonly stockService: StockService,
    @Inject(SplitBatchOrderEntity)
    readonly splitBatchOrderEntity: EntityTarget<T>,
    @Inject(SplitBatchOrderItemEntity)
    readonly splitBatchOrderItemEntity: EntityTarget<K>,
  ) {}

  split(options: SplitBatchInput, outerManager?: EntityManager): Promise<T> {
    return runInTransaction(this.dataSource, outerManager, async (manager) => {
      const splitBatchOrderRepository =
        manager.getRepository<SplitBatchOrderEntityClass>(
          this.splitBatchOrderEntity,
        );
      const splitBatchOrderItemRepository = manager.getRepository(
        this.splitBatchOrderItemEntity,
      );
      const splitBatchOrderChangeRepository = manager.getRepository(
        SplitBatchOrderChangeEntityClass,
      );
      const orderRepository = manager.getRepository(this.entities.order);
      const stockRepository = manager.getRepository(this.entities.stock);
      const batchRepository = manager.getRepository(this.entities.batch);

      // Get original batch information
      const originalBatch = await batchRepository.findOneOrFail({
        where: { id: options.batchId },
      });

      /*
       * `batches` carries `UNIQUE (key, materialId)`, so two items aiming at the
       * same target key cannot both create one. Left alone they race
       * `getBatch`'s read-then-create and the second insert aborts the whole
       * split with a constraint violation that names neither item.
       */
      const duplicateKey = options.items
        .map(({ batchKey }) => batchKey)
        .find((batchKey, index, keys) => keys.indexOf(batchKey) !== index);

      if (duplicateKey) {
        throw new Error(
          `Split order names batch key "${duplicateKey}" more than once; each child needs its own key.`,
        );
      }

      const key = await this.helperService.getSeq(this.seqPrefix, manager);
      const order = await splitBatchOrderRepository.save(
        splitBatchOrderRepository.create({
          key,
        }),
      );
      // Get conversion factor for unit conversion
      const conversionFactor = await this.materialService.getConversionFactor(
        originalBatch.materialId,
        options.unitId || undefined,
        manager,
      );

      // Sequential: two items can reference the same *source* batch, and the
      // availability check below reads the ledger the earlier item just wrote.
      for (const item of options.items) {
        await (async () => {
          // Get or create target batch. The genealogy link and the host's
          // attributes only land when this call creates the batch — reusing an
          // existing key keeps whatever it already carries.
          const targetBatch = await this.batchService.getBatch({
            key: item.batchKey,
            materialId: originalBatch.materialId,
            parentBatchId: options.batchId,
            attributes: item.attributes ?? null,
            manager,
          });

          // Create base order record
          const baseOrder = await orderRepository.save({});

          // Create split batch order item
          const splitItem = await splitBatchOrderItemRepository.save(
            splitBatchOrderItemRepository.create({
              targetSplitQuantity: item.quantity,
              locationId: this.stockService.resolveLocationId(item.locationId),
              loaderId: item.loaderId,
              orderId: order.id,
            } as DeepPartial<K>),
          );

          // Record the change
          await splitBatchOrderChangeRepository.save(
            splitBatchOrderChangeRepository.create({
              itemId: splitItem.id,
              id: baseOrder.id,
              quantityChanged: item.quantity * conversionFactor,
            }),
          );

          // Update stock: deduct from original batch and add to target batch
          await this.stockService.validateStockAvailability(
            {
              materialId: originalBatch.materialId,
              batchId: options.batchId,
              locationId: this.stockService.resolveLocationId(item.locationId),
              loaderId: this.stockService.resolveLoaderId(item.loaderId),
              quantity: item.quantity * conversionFactor,
            },
            manager,
          );

          await stockRepository.save(
            stockRepository.create([
              // Deduct from original batch
              {
                orderId: baseOrder.id,
                materialId: originalBatch.materialId,
                batchId: options.batchId,
                locationId: this.stockService.resolveLocationId(
                  item.locationId,
                ),
                loaderId: this.stockService.resolveLoaderId(item.loaderId),
                quantity: -1 * item.quantity * conversionFactor,
              } as DeepPartial<StockEntityClass>,
              // Add to target batch
              {
                orderId: baseOrder.id,
                materialId: originalBatch.materialId,
                batchId: targetBatch.id,
                locationId: this.stockService.resolveLocationId(
                  item.locationId,
                ),
                loaderId: this.stockService.resolveLoaderId(item.loaderId),
                quantity: item.quantity * conversionFactor,
              } as DeepPartial<StockEntityClass>,
            ]),
          );
        })();
      }

      return order as T;
    });
  }
}
