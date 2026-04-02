import { Inject, Injectable } from '@nestjs/common';
import {
  TransferCustomerOrderEntity,
  TransferCustomerOrderEntityClass,
  TransferCustomerOrderItemEntity,
  TransferCustomerOrderItemEntityClass,
  TransferCustomerOrderChangeEntityClass,
  StockEntity,
  StockEntityClass,
  LocationEntityClass,
  LoadersEntityClass,
} from '../models';
import {
  DataSource,
  DeepPartial,
  EntityManager,
  EntityTarget,
  In,
  IsNull,
  Not,
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
  materialId: string;
  batchId: string;
  locationId?: string;
  loaderId?: string;
  quantity: number;
  locationKey: string;
  loaderKey?: string;
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
      location: manager.getRepository(LocationEntityClass),
      loader: manager.getRepository(LoadersEntityClass),
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

      items.forEach((item) => {
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

  async returnTransferCustomerOrder(
    options: TransferCustomerOrderItemInput | TransferCustomerOrderItemInput[],
    manager = this.dataSource.manager,
  ): Promise<T> {
    if (!Array.isArray(options)) options = [options];
    const repos = this.getRepositories(manager);

    const key = await this.helperService.getSeq(this.seqPrefix, manager);
    const order = await repos.transferCustomerOrder.save(
      repos.transferCustomerOrder.create({ key }),
    );

    if (options.length > 0) {
      await Promise.all(
        options.map(async (data) => {
          // Ensure required fields are present
          if (!data.batchId || !data.materialId) return;

          const originalBatch =
            await this.batchService.batchRepository.findOneByOrFail({
              id: data.batchId,
              customerId: Not(IsNull()),
            });
          const splittedBatch = await this.batchService.splitBatch({
            id: data.batchId,
            customerId: null, // split out a batch with null customerId to indicate it's returned and available
            manager,
          });

          // Save item with ORIGINAL batch id to maintain source state
          const item = await repos.transferCustomerOrderItem.save(
            repos.transferCustomerOrderItem.create({
              ...data,
              customerId: originalBatch.customerId as string,
              targetTransferredQuantity: -1 * data.quantity,
              orderId: order.id,
            }),
          );

          const base = await repos.order.save({});
          const conversionFactor =
            await this.materialService.getConversionFactor(
              item.materialId,
              item.unitId || undefined,
            );

          const change = await repos.transferCustomerOrderChange.save(
            repos.transferCustomerOrderChange.create({
              itemId: item.id,
              id: base.id,
              quantityChanged:
                -1 * item.targetTransferredQuantity * conversionFactor,
            }),
          );
          let targetLocationId: string | undefined;
          if (data.locationKey)
            targetLocationId = await repos.location
              .findOneByOrFail({ key: data.locationKey })
              .then(({ id }) => id);

          let targetLoaderId: string | undefined;
          if (data.loaderKey)
            targetLoaderId = await repos.loader
              .findOneByOrFail({ serialId: data.loaderKey })
              .then(({ id }) => id);

          // Stock movements track the hold through splitted batch
          await repos.stock.save(
            repos.stock.create([
              // deduct from original batch available stock
              {
                orderId: base.id,
                materialId: item.materialId,
                batchId: item.batchId, // original batch
                locationId: item.locationId || undefined,
                loaderId: item.loaderId || undefined,
                quantity: -1 * change.quantityChanged,
              } as DeepPartial<StockEntityClass>,
              // add to splitted batch in released state
              {
                orderId: base.id,
                materialId: item.materialId,
                batchId: splittedBatch.id, // splitted batch marked with null customerId
                locationId: targetLocationId,
                loaderId: targetLoaderId,
                quantity: change.quantityChanged,
              } as DeepPartial<StockEntityClass>,
            ]),
          );
        }),
      );
    }
    return order as T;
  }
}
