import { Inject, Injectable } from '@nestjs/common';
import {
  ReclassifyInventoryOrderChangeEntityClass,
  ReclassifyInventoryOrderEntity,
  ReclassifyInventoryOrderEntityClass,
  ReclassifyInventoryOrderItemEntity,
  ReclassifyInventoryOrderItemEntityClass,
  StockEntityClass,
  BatchEntityClass,
  MaterialEntityClass,
} from '../models';
import { DataSource, DeepPartial, EntityTarget } from 'typeorm';
import { ReclassifyInventoryOrderInput } from '../typings/reclassify-inventory-order.input';
import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import { MaterialService } from './material.service';
import { BatchService } from './batch.service';
import { HelperService } from './helper.service';
import { StockService } from './stock.service';

@Injectable()
export class ReclassifyInventoryOrderService<
  T extends
    ReclassifyInventoryOrderEntityClass = ReclassifyInventoryOrderEntityClass,
  K extends
    ReclassifyInventoryOrderItemEntityClass = ReclassifyInventoryOrderItemEntityClass,
> {
  private readonly seqPrefix = 'RCO';
  constructor(
    private readonly dataSource: DataSource,
    private readonly materialService: MaterialService,
    private readonly batchService: BatchService,
    private readonly helperService: HelperService,
    private readonly stockService: StockService,
    @Inject(ReclassifyInventoryOrderEntity)
    readonly reclassifyInventoryOrderEntity: EntityTarget<T>,
    @Inject(ReclassifyInventoryOrderItemEntity)
    readonly reclassifyInventoryOrderItemEntity: EntityTarget<K>,
  ) {}

  reclassify(options: ReclassifyInventoryOrderInput): Promise<T> {
    return this.dataSource.transaction(async (manager) => {
      const reclassifyOrderRepository =
        manager.getRepository<ReclassifyInventoryOrderEntityClass>(
          this.reclassifyInventoryOrderEntity,
        );
      const reclassifyOrderItemRepository = manager.getRepository(
        this.reclassifyInventoryOrderItemEntity,
      );
      const reclassifyOrderChangeRepository = manager.getRepository(
        ReclassifyInventoryOrderChangeEntityClass,
      );
      const orderRepository = manager.getRepository(OrderEntity);
      const stockRepository = manager.getRepository(StockEntityClass);
      const batchRepository = manager.getRepository(BatchEntityClass);
      const materialRepository = manager.getRepository(MaterialEntityClass);

      // Ensure new material exists
      const material = await materialRepository.findOneOrFail({
        where: { key: options.materialKey },
      });

      const key = await this.helperService.getSeq(this.seqPrefix, manager);
      const order = await reclassifyOrderRepository.save(
        reclassifyOrderRepository.create({
          key,
        }),
      );

      // Process each item reclassification
      await Promise.all(
        options.items.map(async (item) => {
          if (item.materialId === material.id) {
            throw new Error(
              `Item with batchId ${item.batchId} is already classified under the target material`,
            );
          }
          // Get conversion factor for unit conversion
          const conversionFactor =
            await this.materialService.getConversionFactor(
              material.id,
              item.unitId || undefined,
            );

          const { key, ...batch } = await batchRepository.findOneOrFail({
            where: { id: item.batchId },
          });

          // Get or create a batch for the new material
          const targetBatch = await this.batchService
            .getBatch({
              materialId: material.id,
              key,
              manager,
            })
            .then(({ id }) =>
              this.batchService.splitBatch({
                saleId: batch.saleId ?? null,
                saleSerialId: batch.saleSerialId ?? null,
                customerId: batch.customerId ?? null,
                vendorId: batch.vendorId ?? null,
                inspectionResult: batch.inspectionResult ?? null,
                transferId: batch.transferId ?? null,
                held: batch.held ?? false,
                inShipment: batch.inShipment ?? false,
                manager,
                id,
              }),
            );

          // Create base order record
          const baseOrder = await orderRepository.save({});

          // Create reclassify order item
          const reclassifyItem = await reclassifyOrderItemRepository.save(
            reclassifyOrderItemRepository.create({
              targetReclassifiedQuantity: item.quantity,
              locationId: item.locationId,
              loaderId: item.loaderId,
              orderId: order.id,
            } as DeepPartial<K>),
          );

          // Record the change
          await reclassifyOrderChangeRepository.save(
            reclassifyOrderChangeRepository.create({
              itemId: reclassifyItem.id,
              id: baseOrder.id,
              quantityChanged: item.quantity * conversionFactor,
            }),
          );

          // Update stock: deduct from original material and add to new material
          await this.stockService.validateStockAvailability(
            {
              materialId: item.materialId,
              batchId: item.batchId,
              locationId: item.locationId,
              loaderId: this.stockService.resolveLoaderId(item.loaderId),
              quantity: item.quantity * conversionFactor,
            },
            manager,
          );

          await stockRepository.save(
            stockRepository.create([
              // Deduct from original material batch
              {
                orderId: baseOrder.id,
                materialId: item.materialId,
                batchId: item.batchId,
                locationId: item.locationId,
                loaderId: this.stockService.resolveLoaderId(item.loaderId),
                quantity: -1 * item.quantity * conversionFactor,
              } as DeepPartial<StockEntityClass>,
              // Add to new material batch
              {
                orderId: baseOrder.id,
                materialId: material.id,
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
