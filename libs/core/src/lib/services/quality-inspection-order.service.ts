import { Inject, Injectable } from '@nestjs/common';
import {
  QualityInspectionOrderChangeEntityClass,
  QualityInspectionOrderEntity,
  QualityInspectionOrderEntityClass,
  QualityInspectionOrderItemEntity,
  QualityInspectionOrderItemEntityClass,
  StockEntityClass,
} from '../models';
import { DataSource, EntityManager, EntityTarget } from 'typeorm';
import { CreateInspectionOrderInput } from '../typings/create-inspection-order.input';
import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import { BatchService } from './batch.service';
import { MaterialService } from './material.service';
import { StockService } from './stock.service';
import { runInTransaction } from '../utils/run-in-transaction';
import { WmsEntities } from '../models/wms-entities';

@Injectable()
export class QualityInspectionOrderService<
  T extends
    QualityInspectionOrderEntityClass = QualityInspectionOrderEntityClass,
  K extends
    QualityInspectionOrderItemEntityClass = QualityInspectionOrderItemEntityClass,
> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly entities: WmsEntities,
    @Inject(QualityInspectionOrderEntity)
    readonly qualityInspectionOrderEntity: EntityTarget<T>,
    @Inject(QualityInspectionOrderItemEntity)
    readonly qualityInspectionOrderItemEntity: EntityTarget<K>,
    private readonly batchService: BatchService,
    private readonly materialService: MaterialService,
    private readonly stockService: StockService,
  ) {}

  async inspect({
    manager: outerManager,
    options,
  }: {
    manager?: EntityManager;
    options: CreateInspectionOrderInput;
  }): Promise<T> {
    return runInTransaction(this.dataSource, outerManager, async (manager) => {
      const orderRepository = manager.getRepository<OrderEntity>(
        this.entities.order,
      );
      const qualityInspectionOrderRepository =
        manager.getRepository<QualityInspectionOrderEntityClass>(
          this.qualityInspectionOrderEntity,
        );
      const qualityInspectionOrderItemRepository =
        manager.getRepository<QualityInspectionOrderItemEntityClass>(
          this.qualityInspectionOrderItemEntity,
        );
      const qualityInspectionOrderChangeRepository =
        manager.getRepository<QualityInspectionOrderChangeEntityClass>(
          QualityInspectionOrderChangeEntityClass,
        );
      const stockRepository = manager.getRepository(this.entities.stock);

      const order = await qualityInspectionOrderRepository.save(
        qualityInspectionOrderRepository.create({
          key: options.key,
          note: options.note,
        }),
      );
      // Every (material, batch) this call deducts from, locked up front in a
      // fixed order so overlapping operations cannot deadlock each other.
      await this.stockService.lockStockSlots(options.items, manager);
      for (const data of options.items) {
        await (async () => {
          if (!data.batchId || !data.materialId) return;

          const item = await qualityInspectionOrderItemRepository.save(
            qualityInspectionOrderItemRepository.create({
              ...data,
              orderId: order.id,
              targetInspectedQuantity: data.quantity,
            }),
          );

          // Create base order for the change
          const baseOrder = await orderRepository.save({});

          // Get conversion factor to convert to base unit
          const conversionFactor =
            await this.materialService.getConversionFactor(
              item.materialId,
              item.unitId || undefined,
              manager,
            );

          await qualityInspectionOrderChangeRepository.save(
            qualityInspectionOrderChangeRepository.create({
              itemId: item.id,
              quantityChanged: item.targetInspectedQuantity * conversionFactor,
              order: baseOrder,
            }),
          );

          const splittedBatch = await this.batchService.splitBatch({
            manager,
            id: data.batchId,
            inspectionResult: data.inspectionResult,
          });

          await stockRepository.save([
            stockRepository.create({
              orderId: baseOrder.id,
              materialId: data.materialId,
              batchId: splittedBatch.id,
              locationId: this.stockService.resolveLocationId(data.locationId),
              loaderId: this.stockService.resolveLoaderId(data.loaderId),
              quantity: data.quantity * conversionFactor,
            }),
            stockRepository.create({
              orderId: baseOrder.id,
              materialId: data.materialId,
              batchId: data.batchId,
              locationId: this.stockService.resolveLocationId(data.locationId),
              loaderId: this.stockService.resolveLoaderId(data.loaderId),
              quantity: -1 * data.quantity * conversionFactor,
            }),
          ]);
        })();
      }
      return order as T;
    });
  }
}
