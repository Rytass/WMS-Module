import { BadRequestException, Inject, Injectable } from '@nestjs/common';
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
import { assertPositiveQuantity } from '../utils/assert-positive-quantity';
import { runInTransaction } from '../utils/run-in-transaction';
import { WmsEntities } from '../models/wms-entities';
import { negateQuantity, toBaseQuantity } from '../utils/quantity';

/** Attribute documents are equal when their JSON content is, whatever the key order. */
const canonical = (value: unknown): unknown =>
  Array.isArray(value)
    ? value.map(canonical)
    : value !== null && typeof value === 'object'
      ? Object.fromEntries(
          Object.entries(value)
            .sort(([left], [right]) =>
              left < right ? -1 : left > right ? 1 : 0,
            )
            .map(([key, inner]) => [key, canonical(inner)]),
        )
      : value;

const sameAttributes = (
  left: Record<string, unknown> | null | undefined,
  right: Record<string, unknown> | null | undefined,
): boolean =>
  JSON.stringify(canonical(left ?? null)) ===
  JSON.stringify(canonical(right ?? null));

/** Attribute documents are equal when their JSON content is, whatever the key order. */
const canonical = (value: unknown): unknown =>
  Array.isArray(value)
    ? value.map(canonical)
    : value !== null && typeof value === 'object'
      ? Object.fromEntries(
          Object.entries(value)
            .sort(([left], [right]) =>
              left < right ? -1 : left > right ? 1 : 0,
            )
            .map(([key, inner]) => [key, canonical(inner)]),
        )
      : value;

const sameAttributes = (
  left: Record<string, unknown> | null | undefined,
  right: Record<string, unknown> | null | undefined,
): boolean =>
  JSON.stringify(canonical(left ?? null)) ===
  JSON.stringify(canonical(right ?? null));

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
      options.items.forEach((item, index) =>
        assertPositiveQuantity(item.quantity, 'quantity', `item #${index}`),
      );

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

      // Verify all source batches have identical metadata (except key and groupId).
      // One batch can be named by several lines (it sits at two locations), so
      // the lookup is compared against the distinct ids, not the line count.
      const batchIds = [
        ...new Set(options.items.map(({ batchId }) => batchId)),
      ];
      const sourceBatches = await batchRepository.find({
        where: { id: In(batchIds) },
      });

      if (sourceBatches.length !== batchIds.length) {
        throw new BadRequestException('Some source batches were not found');
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
        'requiresInspection',
      ] as const;

      const referenceBatch = sourceBatches[0];
      for (const batch of sourceBatches) {
        for (const field of metadataKeys) {
          if (batch[field] !== referenceBatch[field]) {
            throw new BadRequestException(
              `Batch metadata mismatch on field "${field}": batch ${batch.id} has ${batch[field]}, expected ${referenceBatch[field]}`,
            );
          }
        }

        // Host attributes are part of what a batch is, so batches that differ
        // in them are different batches and are not merged into one.
        if (!sameAttributes(batch.attributes, referenceBatch.attributes)) {
          throw new BadRequestException(
            `Batch metadata mismatch on field "attributes": batch ${batch.id} has ${JSON.stringify(batch.attributes)}, expected ${JSON.stringify(referenceBatch.attributes)}`,
          );
        }
      }

      // Get target batch information (batch to merge into)
      const targetBatch = await this.batchService.getBatch({
        manager,
        materialId: options.materialId,
        key: options.batchKey,
      });

      // Every source batch, locked up front in one sorted pass and before the
      // split below (stock locks always precede a batch-group lock). Locked
      // item by item, two merges naming the same batches in opposite order
      // deadlocked.
      await this.stockService.lockStockSlots(
        batchIds.map((batchId) => ({
          materialId: targetBatch.materialId,
          batchId,
        })),
        manager,
      );

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
        requiresInspection: referenceBatch.requiresInspection,
        attributes: referenceBatch.attributes,
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
              quantityChanged: toBaseQuantity(item.quantity, conversionFactor),
            }),
          );

          // Update stock: deduct from source batch and add to target batch
          await this.stockService.validateStockAvailability(
            {
              materialId: targetBatch.materialId,
              batchId: item.batchId,
              locationId: this.stockService.resolveLocationId(item.locationId),
              loaderId: this.stockService.resolveLoaderId(item.loaderId),
              quantity: toBaseQuantity(item.quantity, conversionFactor),
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
                quantity: negateQuantity(
                  toBaseQuantity(item.quantity, conversionFactor),
                ),
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
                quantity: toBaseQuantity(item.quantity, conversionFactor),
              } as DeepPartial<StockEntityClass>,
            ]),
          );
        })();
      }
      return order as T;
    });
  }
}
