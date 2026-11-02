import { Inject, Injectable } from '@nestjs/common';
import {
  MergeBatchOrderEntity,
  MergeBatchOrderEntityClass,
  MergeBatchOrderItemEntity,
  MergeBatchOrderItemEntityClass,
  MergeBatchOrderChangeEntityClass,
  StockEntityClass,
  BatchEntityClass,
} from '../models';
import {
  DataSource,
  DeepPartial,
  EntityManager,
  EntityTarget,
  In,
} from 'typeorm';
import { MergeBatchInput } from '../typings/merge-batch.input';
import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import { MaterialService } from './material.service';
import { BatchService } from './batch.service';
import { HelperService } from './helper.service';
import { StockService } from './stock.service';
import { runInTransaction } from '../utils/run-in-transaction';
import { WmsEntities } from '../models/wms-entities';

@Injectable()
export class MergeBatchOrderService<
  T extends MergeBatchOrderEntityClass = MergeBatchOrderEntityClass,
  K extends MergeBatchOrderItemEntityClass = MergeBatchOrderItemEntityClass,
> {
  private readonly seqPrefix = 'MBO';
  constructor(
    private readonly dataSource: DataSource,
    private readonly entities: WmsEntities,
    private readonly materialService: MaterialService,
    private readonly batchService: BatchService,
    private readonly helperService: HelperService,
    private readonly stockService: StockService,
    @Inject(MergeBatchOrderEntity)
    readonly mergeBatchOrderEntity: EntityTarget<T>,
    @Inject(MergeBatchOrderItemEntity)
    readonly mergeBatchOrderItemEntity: EntityTarget<K>,
  ) {}

  merge(options: MergeBatchInput, outerManager?: EntityManager): Promise<T> {
    return runInTransaction(this.dataSource, outerManager, async (manager) => {
      const mergeBatchOrderRepository =
        manager.getRepository<MergeBatchOrderEntityClass>(
          this.mergeBatchOrderEntity,
        );
      const mergeBatchOrderItemRepository = manager.getRepository(
        this.mergeBatchOrderItemEntity,
      );
      const mergeBatchOrderChangeRepository = manager.getRepository(
        MergeBatchOrderChangeEntityClass,
      );
      const orderRepository = manager.getRepository(this.entities.order);
      const stockRepository = manager.getRepository(this.entities.stock);
      const batchRepository = manager.getRepository(this.entities.batch);

      // Verify all source batches have identical metadata (except key and groupId)
      const sourceBatches = await batchRepository.find({
        where: { id: In(options.items.map((item) => item.batchId)) },
      });

      if (sourceBatches.length !== options.items.length) {
        throw new Error('Some source batches were not found');
      }

      const metadataKeys = [
        'saleId',
        'saleSerialId',
        'customerId',
        'vendorId',
        'inspectionResult',
        'transferId',
        'held',
        'inShipment',
      ] as const;

      const referenceBatch = sourceBatches[0];
      for (const batch of sourceBatches) {
        for (const field of metadataKeys) {
          if (batch[field] !== referenceBatch[field]) {
            throw new Error(
              `Batch metadata mismatch on field "${field}": batch ${batch.id} has ${batch[field]}, expected ${referenceBatch[field]}`,
            );
          }
        }
      }

      // Get target batch information (batch to merge into)
      const targetBatch = await this.batchService.getBatch({
        manager,
        materialId: options.materialId,
        key: options.batchKey,
      });

      // Split target batch to inherit the source batches' state
      const mergedBatch = await this.batchService.splitBatch({
        id: targetBatch.id,
        manager,
        saleId: referenceBatch.saleId,
        saleSerialId: referenceBatch.saleSerialId,
        customerId: referenceBatch.customerId,
        vendorId: referenceBatch.vendorId,
        inspectionResult: referenceBatch.inspectionResult,
        transferId: referenceBatch.transferId,
        held: referenceBatch.held,
        inShipment: referenceBatch.inShipment,
      });

      const key = await this.helperService.getSeq(this.seqPrefix, manager);
      const order = await mergeBatchOrderRepository.save(
        mergeBatchOrderRepository.create({
          key,
        }),
      );

      // Process each item to merge
      for (const item of options.items) {
        await (async () => {
          // Get conversion factor for unit conversion
          const conversionFactor =
            await this.materialService.getConversionFactor(
              targetBatch.materialId,
              item.unitId || undefined,
              manager,
            );

          // Create base order record
          const baseOrder = await orderRepository.save({});

          // Create merge batch order item
          const mergeItem = await mergeBatchOrderItemRepository.save(
            mergeBatchOrderItemRepository.create({
              targetMergedQuantity: item.quantity,
              orderId: order.id,
              locationId: this.stockService.resolveLocationId(item.locationId),
              loaderId: item.loaderId || null,
            } as DeepPartial<K>),
          );

          // Record the change
          await mergeBatchOrderChangeRepository.save(
            mergeBatchOrderChangeRepository.create({
              itemId: mergeItem.id,
              id: baseOrder.id,
              quantityChanged: item.quantity * conversionFactor,
            }),
          );

          // Update stock: deduct from source batch and add to target batch
          await this.stockService.validateStockAvailability(
            {
              materialId: targetBatch.materialId,
              batchId: item.batchId,
              locationId: this.stockService.resolveLocationId(item.locationId),
              loaderId: this.stockService.resolveLoaderId(item.loaderId),
              quantity: item.quantity * conversionFactor,
            },
            manager,
          );

          await stockRepository.save(
            stockRepository.create([
              // Deduct from source batch
              {
                orderId: baseOrder.id,
                materialId: targetBatch.materialId,
                batchId: item.batchId,
                locationId: this.stockService.resolveLocationId(
                  item.locationId,
                ),
                loaderId: this.stockService.resolveLoaderId(item.loaderId),
                quantity: -1 * item.quantity * conversionFactor,
              } as DeepPartial<StockEntityClass>,
              // Add to target batch
              {
                orderId: baseOrder.id,
                materialId: targetBatch.materialId,
                batchId: mergedBatch.id,
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
