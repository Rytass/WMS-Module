import { Inject, Injectable } from '@nestjs/common';
import {
  TransferCustomerOrderEntity,
  TransferCustomerOrderEntityClass,
  TransferCustomerOrderItemEntity,
  TransferCustomerOrderItemEntityClass,
  TransferCustomerOrderChangeEntityClass,
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
  CreateTransferCustomerOrderInput,
  UpdateTransferCustomerOrderInput,
} from '../typings/create-transfer-customer-order.input';
import { HelperService } from './helper.service';
import { MaterialService } from './material.service';
import { BatchService } from './batch.service';

export type TransferCustomerOrderItemInput = {
  itemId: string;
  quantity: number;
};

@Injectable()
export class TransferCustomerOrderService<
  T extends TransferCustomerOrderEntityClass = TransferCustomerOrderEntityClass,
  K extends
    TransferCustomerOrderItemEntityClass = TransferCustomerOrderItemEntityClass,
> {
  private readonly seqPrefix = 'TCO';

  constructor(
    private readonly dataSource: DataSource,
    private readonly helperService: HelperService,
    private readonly materialService: MaterialService,
    private readonly batchService: BatchService,
    @Inject(TransferCustomerOrderEntity)
    readonly transferCustomerOrderEntity: EntityTarget<T>,
    @Inject(TransferCustomerOrderItemEntity)
    readonly transferCustomerOrderItemEntity: EntityTarget<K>,
    @Inject(StockEntity) readonly stockEntity: EntityTarget<StockEntityClass>,
  ) {}

  private getRepositories(manager: EntityManager) {
    return {
      transferCustomerOrder:
        manager.getRepository<TransferCustomerOrderEntityClass>(
          this.transferCustomerOrderEntity,
        ),
      transferCustomerOrderItem:
        manager.getRepository<TransferCustomerOrderItemEntityClass>(
          this.transferCustomerOrderItemEntity,
        ),
      transferCustomerOrderChange: manager.getRepository(
        TransferCustomerOrderChangeEntityClass,
      ),
      order: manager.getRepository<OrderEntity>(OrderEntity),
      stock: manager.getRepository<StockEntityClass>(this.stockEntity),
    };
  }

  private async processTransferCustomerOrderItems(
    items: Partial<TransferCustomerOrderItemEntityClass>[],
    manager: EntityManager,
  ): Promise<void> {
    const repos = this.getRepositories(manager);
    await Promise.all(
      items.map(async (data) => {
        // Ensure required fields are present
        if (!data.batchId || !data.materialId) return;

        // Split batch first with customerId to track customer allocation state
        const splittedBatch = await this.batchService.splitBatch({
          id: data.batchId,
          customerId: data.customerId,
          manager,
        });

        // Save item with ORIGINAL batch id to maintain source state
        const item = await repos.transferCustomerOrderItem.save(
          repos.transferCustomerOrderItem.create(data),
        );

        const base = await repos.order.save({});
        const conversionFactor = await this.materialService.getConversionFactor(
          item.materialId,
          item.unitId || undefined,
        );

        await repos.transferCustomerOrderChange.save(
          repos.transferCustomerOrderChange.create({
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
            // add to splitted batch in customer transfer state
            {
              orderId: base.id,
              materialId: item.materialId,
              batchId: splittedBatch.id, // splitted batch marked with customerId
              locationId: item.locationId || undefined,
              loaderId: item.loaderId || undefined,
              quantity: item.targetTransferredQuantity * conversionFactor,
            } as DeepPartial<StockEntityClass>,
          ]),
        );
      }),
    );
  }

  async createTransferCustomerOrder(
    options: CreateTransferCustomerOrderInput,
    manager = this.dataSource.manager,
  ): Promise<T> {
    const repos = this.getRepositories(manager);
    const key = await this.helperService.getSeq(this.seqPrefix);
    const { items, ...orderOptions } = options;
    const order = await repos.transferCustomerOrder.save(
      repos.transferCustomerOrder.create({
        key,
        ...orderOptions,
      }),
    );

    if (items?.length) {
      const processedItems = items.map((item) => ({
        ...item,
        orderId: order.id,
        customerId: options.customerId,
      }));
      await this.processTransferCustomerOrderItems(processedItems, manager);
    }

    return order as T;
  }

  async updateTransferCustomerOrder({
    id,
    manager = this.dataSource.manager,
    ...options
  }: UpdateTransferCustomerOrderInput & {
    manager?: EntityManager;
  }): Promise<T> {
    const repos = this.getRepositories(manager);
    const { items, ...orderOptions } = options;

    const order = await repos.transferCustomerOrder.findOneBy({ id });
    if (!order) throw new Error(`Order with id ${id} not found`);

    const updated = await repos.transferCustomerOrder.save({
      ...order,
      ...orderOptions,
    });

    if (items?.length) {
      const existingItemIds = new Set(
        (
          await repos.transferCustomerOrderItem.find({
            where: { orderId: id },
            relations: ['changes'],
          })
        ).map((item) => item.id),
      );

      const newItems: Partial<TransferCustomerOrderItemEntityClass>[] = [];
      const existingItems: Partial<TransferCustomerOrderItemEntityClass>[] = [];

      options.items.forEach((item) => {
        if (item.removedAt) return;
        if (!item.id) newItems.push({ ...item, orderId: id });
        else if (existingItemIds.has(item.id))
          existingItems.push({ ...item, orderId: id });
      });

      if (newItems.length)
        await this.processTransferCustomerOrderItems(newItems, manager);
      if (existingItems.length)
        await repos.transferCustomerOrderItem.save(
          await Promise.all(
            existingItems.map((item) =>
              repos.transferCustomerOrderItem.create(item),
            ),
          ),
        );
    }

    return updated as T;
  }

  returnTransferCustomerOrder(
    options: TransferCustomerOrderItemInput | TransferCustomerOrderItemInput[],
  ): Promise<boolean> {
    if (!Array.isArray(options)) options = [options];
    return this.dataSource.transaction(async (manager) => {
      const repos = this.getRepositories(manager);
      const items = await repos.transferCustomerOrderItem.find({
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

          // Create splitted batch for return completion by setting customerId to null
          const returnedBatch = await this.batchService.splitBatch({
            id: item.batchId,
            customerId: null, // returned batch has no customerId to indicate it's available
            manager,
          });

          const base = await repos.order.save({});
          await Promise.all([
            repos.transferCustomerOrderChange.save(
              repos.transferCustomerOrderChange.create({
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
