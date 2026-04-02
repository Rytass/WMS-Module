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
import { DataSource, DeepPartial, EntityTarget } from 'typeorm';
import { MergeBatchInput } from '../typings/merge-batch.input';
import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import { MaterialService } from './material.service';
import { BatchService } from './batch.service';
import { HelperService } from './helper.service';
import { StockService } from './stock.service';

@Injectable()
export class MergeBatchOrderService<
  T extends MergeBatchOrderEntityClass = MergeBatchOrderEntityClass,
  K extends MergeBatchOrderItemEntityClass = MergeBatchOrderItemEntityClass,
> {
  private readonly seqPrefix = 'MBO';
  constructor(
    private readonly dataSource: DataSource,
    private readonly materialService: MaterialService,
    private readonly batchService: BatchService,
    private readonly helperService: HelperService,
    private readonly stockService: StockService,
    @Inject(MergeBatchOrderEntity)
    readonly mergeBatchOrderEntity: EntityTarget<T>,
    @Inject(MergeBatchOrderItemEntity)
    readonly mergeBatchOrderItemEntity: EntityTarget<K>,
  ) {}

  merge(options: MergeBatchInput): Promise<T> {
    return this.dataSource.transaction(async (manager) => {
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
      const orderRepository = manager.getRepository(OrderEntity);
      const stockRepository = manager.getRepository(StockEntityClass);

      // Get target batch information (batch to merge into)
      const targetBatch = await this.batchService.getBatch({
        manager,
        materialId: options.materialId,
        key: options.batchKey,
      });
      const key = await this.helperService.getSeq(this.seqPrefix, manager);
      const order = await mergeBatchOrderRepository.save(
        mergeBatchOrderRepository.create({
          key,
        }),
      );

      // Process each item to merge
      await Promise.all(
        options.items.map(async (item) => {
          // Get conversion factor for unit conversion
          const conversionFactor =
            await this.materialService.getConversionFactor(
              targetBatch.materialId,
              item.unitId || undefined,
            );

          // Create base order record
          const baseOrder = await orderRepository.save({});

          // Create merge batch order item
          const mergeItem = await mergeBatchOrderItemRepository.save(
            mergeBatchOrderItemRepository.create({
              targetMergedQuantity: item.quantity,
              orderId: order.id,
              locationId: item.locationId || '',
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
          await stockRepository.save(
            stockRepository.create([
              // Deduct from source batch
              {
                orderId: baseOrder.id,
                materialId: targetBatch.materialId,
                batchId: item.batchId,
                locationId: item.locationId || undefined,
                loaderId: this.stockService.resolveLoaderId(item.loaderId),
                quantity: -1 * item.quantity * conversionFactor,
              } as DeepPartial<StockEntityClass>,
              // Add to target batch
              {
                orderId: baseOrder.id,
                materialId: targetBatch.materialId,
                batchId: targetBatch.id,
                locationId: item.locationId || undefined,
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
