import { Inject, Injectable } from '@nestjs/common';
import {
  TransferVendorOrderEntity,
  TransferVendorOrderEntityClass,
  TransferVendorOrderItemEntity,
  TransferVendorOrderItemEntityClass,
  TransferVendorOrderChangeEntityClass,
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
  CreateTransferVendorOrderInput,
  UpdateTransferVendorOrderInput,
} from '../typings/create-transfer-vendor-order.input';
import { HelperService } from './helper.service';
import { MaterialService } from './material.service';
import { BatchService } from './batch.service';
import { StockService } from './stock.service';

export type TransferVendorOrderItemInput = {
  materialId: string;
  batchId: string;
  locationId?: string;
  loaderId?: string;
  quantity: number;
  locationKey: string;
  loaderKey?: string;
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
    private readonly stockService: StockService,
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
      location: manager.getRepository(LocationEntityClass),
      loader: manager.getRepository(LoadersEntityClass),
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
        await this.stockService.validateStockAvailability({
          materialId: item.materialId,
          batchId: item.batchId,
          locationId: item.locationId || undefined,
          loaderId: this.stockService.resolveLoaderId(item.loaderId),
          quantity: item.targetTransferredQuantity * conversionFactor,
        }, manager);

        await repos.stock.save(
          repos.stock.create([
            // deduct from original batch available stock
            {
              orderId: base.id,
              materialId: item.materialId,
              batchId: item.batchId, // original batch
              locationId: item.locationId || undefined,
              loaderId: this.stockService.resolveLoaderId(item.loaderId),
              quantity: -1 * item.targetTransferredQuantity * conversionFactor,
            } as DeepPartial<StockEntityClass>,
            // add to splitted batch in vendor transfer state
            {
              orderId: base.id,
              materialId: item.materialId,
              batchId: splittedBatch.id, // splitted batch marked with vendorId
              locationId: item.locationId || undefined,
              loaderId: this.stockService.resolveLoaderId(item.loaderId),
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
    const { items, ...orderOptions } = options;
    const order = await repos.transferVendorOrder.save(
      repos.transferVendorOrder.create({
        key,
        ...orderOptions,
      }),
    );

    if (items?.length) {
      const processedItems = items.map((item) => ({
        ...item,
        orderId: order.id,
        vendorId: options.vendorId,
      }));
      await this.processTransferVendorOrderItems(processedItems, manager);
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
    const { items, ...orderOptions } = options;

    const order = await repos.transferVendorOrder.findOneBy({ id });
    if (!order) throw new Error(`Order with id ${id} not found`);

    const updated = await repos.transferVendorOrder.save({
      ...order,
      ...orderOptions,
    });

    if (items?.length) {
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

      items.forEach((item) => {
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

  async returnTransferVendorOrder(
    options: TransferVendorOrderItemInput | TransferVendorOrderItemInput[],
    manager = this.dataSource.manager,
  ): Promise<T> {
    if (!Array.isArray(options)) options = [options];
    const repos = this.getRepositories(manager);

    const key = await this.helperService.getSeq(this.seqPrefix, manager);
    const order = await repos.transferVendorOrder.save(
      repos.transferVendorOrder.create({ key }),
    );

    if (options.length > 0) {
      await Promise.all(
        options.map(async (data) => {
          // Ensure required fields are present
          if (!data.batchId || !data.materialId) return;

          const originalBatch =
            await this.batchService.batchRepository.findOneByOrFail({
              id: data.batchId,
              vendorId: Not(IsNull()),
            });
          const splittedBatch = await this.batchService.splitBatch({
            id: data.batchId,
            vendorId: null, // split out a batch with null vendorId to indicate it's returned and available
            manager,
          });

          // Save item with ORIGINAL batch id to maintain source state
          const item = await repos.transferVendorOrderItem.save(
            repos.transferVendorOrderItem.create({
              ...data,
              vendorId: originalBatch.vendorId as string,
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

          const change = await repos.transferVendorOrderChange.save(
            repos.transferVendorOrderChange.create({
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
          await this.stockService.validateStockAvailability({
            materialId: item.materialId,
            batchId: item.batchId,
            locationId: item.locationId || undefined,
            loaderId: this.stockService.resolveLoaderId(item.loaderId),
            quantity: change.quantityChanged,
          }, manager);

          await repos.stock.save(
            repos.stock.create([
              // deduct from original batch available stock
              {
                orderId: base.id,
                materialId: item.materialId,
                batchId: item.batchId, // original batch
                locationId: item.locationId || undefined,
                loaderId: this.stockService.resolveLoaderId(item.loaderId),
                quantity: -1 * change.quantityChanged,
              } as DeepPartial<StockEntityClass>,
              // add to splitted batch in released state
              {
                orderId: base.id,
                materialId: item.materialId,
                batchId: splittedBatch.id, // splitted batch marked with null vendorId
                locationId: targetLocationId,
                loaderId: this.stockService.resolveLoaderId(targetLoaderId),
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
