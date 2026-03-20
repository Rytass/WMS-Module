import { Inject, Injectable } from '@nestjs/common';
import {
  TransferVendorOrderEntity,
  TransferVendorOrderEntityClass,
  TransferVendorOrderItemEntity,
  TransferVendorOrderItemEntityClass,
  TransferVendorOrderChangeEntityClass,
  StockEntity,
  StockEntityClass,
} from '../models';
import {
  DataSource,
  DeepPartial,
  EntityManager,
  EntityTarget,
  In,
} from 'typeorm';
import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import {
  CreateTransferVendorOrderInput,
  UpdateTransferVendorOrderInput,
} from '../typings/create-transfer-vendor-order.input';
import { HelperService } from './helper.service';
import { MaterialService } from './material.service';
import { BatchService } from './batch.service';

export type TransferVendorOrderItemInput = {
  itemId: string;
  quantity: number;
};

@Injectable()
export class TransferVendorOrderService<
  T extends TransferVendorOrderEntityClass = TransferVendorOrderEntityClass,
  K extends
    TransferVendorOrderItemEntityClass = TransferVendorOrderItemEntityClass,
> {
  private readonly seqPrefix = 'TVO';

  constructor(
    private readonly dataSource: DataSource,
    private readonly helperService: HelperService,
    private readonly materialService: MaterialService,
    private readonly batchService: BatchService,
    @Inject(TransferVendorOrderEntity)
    readonly transferVendorOrderEntity: EntityTarget<T>,
    @Inject(TransferVendorOrderItemEntity)
    readonly transferVendorOrderItemEntity: EntityTarget<K>,
    @Inject(StockEntity) readonly stockEntity: EntityTarget<StockEntityClass>,
  ) {}

  private getRepositories(manager: EntityManager) {
    return {
      transferVendorOrder:
        manager.getRepository<TransferVendorOrderEntityClass>(
          this.transferVendorOrderEntity,
        ),
      transferVendorOrderItem:
        manager.getRepository<TransferVendorOrderItemEntityClass>(
          this.transferVendorOrderItemEntity,
        ),
      transferVendorOrderChange: manager.getRepository(
        TransferVendorOrderChangeEntityClass,
      ),
      order: manager.getRepository<OrderEntity>(OrderEntity),
      stock: manager.getRepository<StockEntityClass>(this.stockEntity),
    };
  }

  private async processTransferVendorOrderItems(
    items: Partial<TransferVendorOrderItemEntityClass>[],
    manager: EntityManager,
  ): Promise<void> {
    const repos = this.getRepositories(manager);
    await Promise.all(
      items.map(async (data) => {
        // Ensure required fields are present
        if (!data.batchId || !data.materialId) return;

        // Split batch first with vendorId to track vendor allocation state
        const splittedBatch = await this.batchService.splitBatch({
          id: data.batchId,
          vendorId: data.vendorId,
          manager,
        });

        // Save item with ORIGINAL batch id to maintain source state
        const item = await repos.transferVendorOrderItem.save(
          repos.transferVendorOrderItem.create(data),
        );

        const base = await repos.order.save({});
        const conversionFactor = await this.materialService.getConversionFactor(
          item.materialId,
          item.unitId || undefined,
        );

        await repos.transferVendorOrderChange.save(
          repos.transferVendorOrderChange.create({
            item,
            order: base,
            quantityChanged: item.targetTransferredQuantity * conversionFactor,
          }),
        );

        // Stock movements track the transfer through splitted batch
        await repos.stock.save(
          repos.stock.create([
            // deduct from original batch available stock
            {
              orderId: base.id,
              materialId: item.materialId,
              batchId: item.batchId, // original batch
              locationId: item.locationId || undefined,
              loaderId: item.loaderId || undefined,
              quantity: -1 * item.targetTransferredQuantity * conversionFactor,
            } as DeepPartial<StockEntityClass>,
            // add to splitted batch in vendor transfer state
            {
              orderId: base.id,
              materialId: item.materialId,
              batchId: splittedBatch.id, // splitted batch marked with vendorId
              locationId: item.locationId || undefined,
              loaderId: item.loaderId || undefined,
              quantity: item.targetTransferredQuantity * conversionFactor,
            } as DeepPartial<StockEntityClass>,
          ]),
        );
      }),
    );
  }

  async createTransferVendorOrder(
    options: CreateTransferVendorOrderInput,
    manager = this.dataSource.manager,
  ): Promise<T> {
    const repos = this.getRepositories(manager);
    const key = await this.helperService.getSeq(this.seqPrefix);
    const order = await repos.transferVendorOrder.save(
      repos.transferVendorOrder.create({
        key,
        ...options,
      }),
    );

    if (options.items?.length) {
      const items = options.items.map((item) => ({
        ...item,
        orderId: order.id,
        vendorId: options.vendorId,
      }));
      await this.processTransferVendorOrderItems(items, manager);
    }

    return order as T;
  }

  async updateTransferVendorOrder({
    id,
    manager = this.dataSource.manager,
    ...options
  }: UpdateTransferVendorOrderInput & {
    manager?: EntityManager;
  }): Promise<T> {
    const repos = this.getRepositories(manager);

    const order = await repos.transferVendorOrder.findOneBy({ id });
    if (!order) throw new Error(`Order with id ${id} not found`);

    const updated = await repos.transferVendorOrder.save({
      ...order,
      ...options,
    });

    if (options.items?.length) {
      const existingItemIds = new Set(
        (
          await repos.transferVendorOrderItem.find({
            where: { orderId: id },
            relations: ['changes'],
          })
        ).map((item) => item.id),
      );

      const newItems: Partial<TransferVendorOrderItemEntityClass>[] = [];
      const existingItems: Partial<TransferVendorOrderItemEntityClass>[] = [];

      options.items.forEach((item) => {
        if (item.removedAt) return;
        if (!item.id) newItems.push({ ...item, orderId: id });
        else if (existingItemIds.has(item.id))
          existingItems.push({ ...item, orderId: id });
      });

      if (newItems.length)
        await this.processTransferVendorOrderItems(newItems, manager);
      if (existingItems.length)
        await repos.transferVendorOrderItem.save(
          await Promise.all(
            existingItems.map((item) =>
              repos.transferVendorOrderItem.create(item),
            ),
          ),
        );
    }

    return updated as T;
  }

  returnTransferVendorOrder(
    options: TransferVendorOrderItemInput | TransferVendorOrderItemInput[],
  ): Promise<boolean> {
    if (!Array.isArray(options)) options = [options];
    return this.dataSource.transaction(async (manager) => {
      const repos = this.getRepositories(manager);
      const items = await repos.transferVendorOrderItem.find({
        where: { id: In(options.map((o) => o.itemId)) },
        relations: ['changes'],
      });

      const itemMap = new Map(items.map((item) => [item.id, item]));

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
            if (change.quantityChanged > 0)
              sum += Number(change.quantityChanged);
            return sum;
          }, 0);

          const remainingQuantity =
            totalTransferred - option.quantity * conversionFactor;

          if (remainingQuantity < 0)
            throw new Error(
              `Return quantity exceeds transferred quantity for item ${item.id}`,
            );

          // Create splitted batch for return completion by setting vendorId to null
          const returnedBatch = await this.batchService.splitBatch({
            id: item.batchId,
            vendorId: null, // returned batch has no vendorId to indicate it's available
            manager,
          });

          const base = await repos.order.save({});
          await Promise.all([
            repos.transferVendorOrderChange.save(
              repos.transferVendorOrderChange.create({
                itemId: item.id,
                id: base.id,
                quantityChanged: -1 * option.quantity * conversionFactor,
              }),
            ),
            repos.stock.save(
              repos.stock.create([
                // add to original batch (restore available)
                {
                  orderId: base.id,
                  materialId: item.materialId,
                  batchId: item.batchId,
                  locationId: item.locationId || undefined,
                  loaderId: item.loaderId || undefined,
                  quantity: option.quantity * conversionFactor,
                } as DeepPartial<StockEntityClass>,
                // deduct from returned splitted batch
                {
                  orderId: base.id,
                  materialId: item.materialId,
                  batchId: returnedBatch.id,
                  locationId: item.locationId || undefined,
                  loaderId: item.loaderId || undefined,
                  quantity: -1 * option.quantity * conversionFactor,
                } as DeepPartial<StockEntityClass>,
              ]),
            ),
          ]);
        }),
      );
      return true;
    });
  }
}
