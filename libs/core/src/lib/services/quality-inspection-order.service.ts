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
    manager = this.dataSource.manager,
    options,
  }: {
    manager?: EntityManager;
    options: CreateInspectionOrderInput;
  }): Promise<T> {
    const orderRepository = manager.getRepository<OrderEntity>(this.entities.order);
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
    await Promise.all(
      options.items.map(async (data) => {
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
        const conversionFactor = await this.materialService.getConversionFactor(
          item.materialId,
          item.unitId || undefined,
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
      }),
    );
    return order as T;
  }
}
