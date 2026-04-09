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
import { DataSource, DeepPartial, EntityTarget } from 'typeorm';
import { SplitBatchInput } from '../typings/split-batch.input';
import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import { MaterialService } from './material.service';
import { BatchService } from './batch.service';
import { HelperService } from './helper.service';
import { StockService } from './stock.service';

@Injectable()
export class SplitBatchOrderService<
  T extends SplitBatchOrderEntityClass = SplitBatchOrderEntityClass,
  K extends SplitBatchOrderItemEntityClass = SplitBatchOrderItemEntityClass,
> {
  private readonly seqPrefix = 'SBO';
  constructor(
    private readonly dataSource: DataSource,
    private readonly materialService: MaterialService,
    private readonly batchService: BatchService,
    private readonly helperService: HelperService,
    private readonly stockService: StockService,
    @Inject(SplitBatchOrderEntity)
    readonly splitBatchOrderEntity: EntityTarget<T>,
    @Inject(SplitBatchOrderItemEntity)
    readonly splitBatchOrderItemEntity: EntityTarget<K>,
  ) {}

  split(options: SplitBatchInput): Promise<T> {
    return this.dataSource.transaction(async (manager) => {
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
      const orderRepository = manager.getRepository(OrderEntity);
      const stockRepository = manager.getRepository(StockEntityClass);
      const batchRepository = manager.getRepository(BatchEntityClass);

      // Get original batch information
      const originalBatch = await batchRepository.findOneOrFail({
        where: { id: options.batchId },
      });

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
      );

      // Process each item split
      await Promise.all(
        options.items.map(async (item) => {
          // Get or create target batch
          const targetBatch = await this.batchService.getBatch({
            key: item.batchKey,
            materialId: originalBatch.materialId,
            manager,
          });

          // Create base order record
          const baseOrder = await orderRepository.save({});

          // Create split batch order item
          const splitItem = await splitBatchOrderItemRepository.save(
            splitBatchOrderItemRepository.create({
              targetSplitQuantity: item.quantity,
              locationId: item.locationId,
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
              locationId: item.locationId,
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
                locationId: item.locationId,
                loaderId: this.stockService.resolveLoaderId(item.loaderId),
                quantity: -1 * item.quantity * conversionFactor,
              } as DeepPartial<StockEntityClass>,
              // Add to target batch
              {
                orderId: baseOrder.id,
                materialId: originalBatch.materialId,
                batchId: targetBatch.id,
                locationId: item.locationId,
                loaderId: this.stockService.resolveLoaderId(item.loaderId),
                quantity: item.quantity * conversionFactor,
              } as DeepPartial<StockEntityClass>,
            ]),
          );
        }),
      );

      return order as T;
    });
  }
}
