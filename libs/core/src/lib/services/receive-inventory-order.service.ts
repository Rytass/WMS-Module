import { Inject, Injectable } from '@nestjs/common';
import {
  ReceiveInventoryOrderEntity,
  ReceiveInventoryOrderEntityClass,
} from '../models/extensions/receive-inventory-order/receive-inventory-order.entity';
import {
  ReceiveInventoryOrderItemEntity,
  ReceiveInventoryOrderItemEntityClass,
} from '../models/extensions/receive-inventory-order/receive-inventory-order-item.entity';
import {
  DataSource,
  DeepPartial,
  EntityManager,
  In,
  IsNull,
  SelectQueryBuilder,
  type EntityTarget,
} from 'typeorm';
import {
  CreateReceiveInventoryOrderInput,
  CreateReceiveInventoryOrderItemInput,
  UpdateReceiveInventoryOrderInput,
} from '../typings/create-receive-inventory-order.input';
import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import {
  FindReceiveInventoryOrderInput,
  ReceiveInventoryOrderStatus,
} from '../typings/find-receive-inventory-order.input';
import {
  LoadersEntityClass,
  LocationEntityClass,
  MaterialEntityClass,
  ReceiveInventoryOrderChangeEntityClass,
  StockEntityClass,
} from '../models';
import { ReceiveInventoryOrderInput } from '../typings/receive-inventory-order.input';
import { MaterialService } from './material.service';
import { BatchService } from './batch.service';
import { HelperService } from './helper.service';
import { StockService } from './stock.service';
import { WmsEntities } from '../models/wms-entities';

/**
 * Service for managing receive inventory orders and their items
 * Supports dynamic entity injection for customization
 * T - Receive Inventory Order entity type
 * K - Receive Inventory Order Item entity type
 */
@Injectable()
export class ReceiveInventoryOrderService<
  T extends ReceiveInventoryOrderEntityClass = ReceiveInventoryOrderEntityClass,
  K extends
    ReceiveInventoryOrderItemEntityClass = ReceiveInventoryOrderItemEntityClass,
> {
  readonly selectQueryBuilder: (alias: string) => SelectQueryBuilder<T>;
  constructor(
    private readonly dataSource: DataSource,
    private readonly entities: WmsEntities,
    private readonly materialService: MaterialService,
    private readonly batchService: BatchService,
    private readonly helperService: HelperService,
    private readonly stockService: StockService,
    @Inject(ReceiveInventoryOrderEntity)
    readonly receiveInventoryOrderEntity: EntityTarget<T>,
    @Inject(ReceiveInventoryOrderItemEntity)
    readonly receiveInventoryOrderItemEntity: EntityTarget<K>,
  ) {
    this.selectQueryBuilder = (alias: string) => {
      return this.dataSource
        .getRepository<T>(this.receiveInventoryOrderEntity)
        .createQueryBuilder(alias)
        .leftJoin(
          (subQuery) =>
            subQuery
              .select(
                `CASE
                  WHEN o."removedAt" IS NOT NULL THEN '${ReceiveInventoryOrderStatus.REMOVED}'
                  WHEN COALESCE((
                    SELECT SUM(CAST(c."quantityChanged" AS NUMERIC))
                    FROM receive_inventory_order_changes c
                    JOIN receive_inventory_order_items i ON c."itemId" = i.id
                    WHERE i."orderId" = o.id
                  ), 0) = COALESCE(target_sum.targetsum, 0) AND COALESCE(target_sum.targetsum, 0) > 0 THEN '${ReceiveInventoryOrderStatus.RECEIVED}'
                  WHEN COALESCE((
                    SELECT SUM(CAST(c."quantityChanged" AS NUMERIC))
                    FROM receive_inventory_order_changes c
                    JOIN receive_inventory_order_items i ON c."itemId" = i.id
                    WHERE i."orderId" = o.id
                  ), 0) > 0 AND COALESCE((
                    SELECT SUM(CAST(c."quantityChanged" AS NUMERIC))
                    FROM receive_inventory_order_changes c
                    JOIN receive_inventory_order_items i ON c."itemId" = i.id
                    WHERE i."orderId" = o.id
                  ), 0) < COALESCE(target_sum.targetsum, 0) THEN '${ReceiveInventoryOrderStatus.PARTIAL_RECEIVED}'
                  ELSE '${ReceiveInventoryOrderStatus.PENDING}'
                END`,
                'status',
              )
              .addSelect('o.id', 'orderid')
              .from('receive_inventory_orders', 'o')
              .leftJoin(
                (sumQuery) =>
                  sumQuery
                    .select('i."orderId"', 'orderid')
                    .addSelect(
                      'SUM(CAST(i."targetReceivedQuantity" AS NUMERIC))',
                      'targetsum',
                    )
                    .from('receive_inventory_order_items', 'i')
                    .groupBy('i."orderId"'),
                'target_sum',
                'target_sum.orderid = o.id',
              ),
          'order_status',
          `${alias}.id = order_status.orderid`,
        )
        .select('orders.id', 'id')
        .addSelect('orders.key', 'key')
        .addSelect('orders.description', 'description')
        .addSelect('orders."createdBy"', 'createdBy')
        .addSelect('orders."createdAt"', 'createdAt')
        .addSelect('orders."removedAt"', 'removedAt')
        .addSelect('order_status.status', `status`);
    };
  }

  private processReceiveInventoryOrderItems(
    items: CreateReceiveInventoryOrderItemInput[],
    orderId: string,
    manager: EntityManager,
  ): Promise<DeepPartial<ReceiveInventoryOrderItemEntityClass>[]> {
    const materialRepository = manager.getRepository<MaterialEntityClass>(
      this.materialService.materialEntity,
    );
    const locationRepository = manager.getRepository<LocationEntityClass>(
      this.entities.location,
    );
    const loaderRepository =
      manager.getRepository<LoadersEntityClass>(LoadersEntityClass);

    return items.reduce(
      async (accPromise, item) => {
        const acc = await accPromise;

        try {
          const material = await materialRepository.findOneBy({
            key: item.materialKey,
          });
          if (!material) return acc;
          const batch = item.batchKey
            ? await this.batchService.getBatch({
                manager,
                materialId: material.id,
                key: item.batchKey,
              })
            : null;

          const location = item.locationKey
            ? await locationRepository.findOneBy({
                key: item.locationKey,
              })
            : null;

          const loader = item.loaderKey
            ? await loaderRepository.findOneBy({
                serialId: item.loaderKey,
              })
            : null;

          return [
            ...acc,
            {
              ...item,
              orderId,
              materialId: material.id,
              batchId: batch?.id || null,
              locationId: this.stockService.resolveLocationId(location?.id),
              loaderId: loader?.id || null,
            },
          ];
        } catch {
          return acc;
        }
      },
      Promise.resolve(
        [] as DeepPartial<ReceiveInventoryOrderItemEntityClass>[],
      ),
    );
  }

  async createReceiveInventoryOrder({
    manager = this.dataSource.manager,
    ...options
  }: CreateReceiveInventoryOrderInput & {
    manager?: EntityManager;
  }): Promise<T> {
    const orderRepository = manager.getRepository<OrderEntity>(
      this.entities.order,
    );
    const receiveInventoryOrderRepository =
      manager.getRepository<ReceiveInventoryOrderEntityClass>(
        this.receiveInventoryOrderEntity,
      );
    const receiveInventoryOrderItemRepository =
      manager.getRepository<ReceiveInventoryOrderItemEntityClass>(
        this.receiveInventoryOrderItemEntity,
      );

    // create base order
    const { id } = await orderRepository.save(orderRepository.create());

    // create receive inventory order
    const { items, ...orderOptions } = options;
    const order = await receiveInventoryOrderRepository.save(
      receiveInventoryOrderRepository.create({ id, ...orderOptions }),
    );

    // create receive inventory order items
    if (items && items.length > 0) {
      const processedItems: ReceiveInventoryOrderItemEntityClass[] =
        receiveInventoryOrderItemRepository.create(
          await this.processReceiveInventoryOrderItems(items, id, manager),
        );
      await receiveInventoryOrderItemRepository.save(processedItems);
    }

    return order as T;
  }

  /**
   * Update a receive inventory order and its items
   * update existing item when id is provided, otherwise create new item, remove behaviour controlled by removedAt field
   */
  async updateReceiveInventoryOrder({
    id,
    manager = this.dataSource.manager,
    ...options
  }: UpdateReceiveInventoryOrderInput & {
    manager?: EntityManager;
  }): Promise<T> {
    const receiveInventoryOrderRepository =
      manager.getRepository<ReceiveInventoryOrderEntityClass>(
        this.receiveInventoryOrderEntity,
      );
    const receiveInventoryOrderItemRepository =
      manager.getRepository<ReceiveInventoryOrderItemEntityClass>(
        this.receiveInventoryOrderItemEntity,
      );

    const order = await receiveInventoryOrderRepository.findOneByOrFail({
      id,
      removedAt: IsNull(),
    });

    const { items, ...orderOptions } = options;
    const updated = await receiveInventoryOrderRepository.save(
      receiveInventoryOrderRepository.create({
        ...order,
        ...orderOptions,
      }),
    );

    if (items?.length) {
      const newItems: Partial<CreateReceiveInventoryOrderItemInput>[] = [];
      const existingItems: Partial<ReceiveInventoryOrderItemEntityClass>[] = [];

      await receiveInventoryOrderItemRepository
        .find({ where: { orderId: id } })
        .then((items) => {
          const itemSet = new Set(items.map((i) => i.id));
          options.items?.forEach((item) => {
            if (!item.id) newItems.push(item);
            else if (itemSet.has(item.id)) existingItems.push(item);
          });
        });

      if (newItems.length)
        await receiveInventoryOrderItemRepository.save(
          receiveInventoryOrderItemRepository.create(
            await this.processReceiveInventoryOrderItems(
              newItems as CreateReceiveInventoryOrderItemInput[],
              id,
              manager,
            ),
          ),
        );

      if (existingItems.length)
        await receiveInventoryOrderItemRepository.save(
          existingItems.map((item) =>
            receiveInventoryOrderItemRepository.create({
              ...item,
              id: item.id,
            }),
          ),
        );
    }

    return updated as T;
  }

  async removeReceiveInventoryOrder(id: string): Promise<boolean> {
    return this.dataSource
      .getRepository<ReceiveInventoryOrderEntityClass>(
        this.receiveInventoryOrderEntity,
      )
      .update({ id }, { removedAt: new Date() })
      .then(({ affected }) => !!affected && affected > 0);
  }

  async findMany(
    options: FindReceiveInventoryOrderInput<T>,
  ): Promise<[T[], number]> {
    const queryBuilder = this.selectQueryBuilder('orders');

    if (options.id)
      queryBuilder.andWhere('orders.id = :id', { id: options.id });

    if (options.createdBy)
      queryBuilder.andWhere('orders."createdBy" ILIKE :createdBy', {
        createdBy: `%${options.createdBy}%`,
      });

    if (options.description)
      queryBuilder.andWhere('orders.description ILIKE :description', {
        description: `%${options.description}%`,
      });

    if (options.dateRange)
      queryBuilder.andWhere('orders."createdAt" BETWEEN :from AND :to', {
        from: options.dateRange.from,
        to: options.dateRange.to,
      });

    if (options.status)
      queryBuilder.andWhere(`status = :status`, {
        status: options.status,
      });

    if (options.statuses && options.statuses.length > 0)
      queryBuilder.andWhere(`status IN (:...statuses)`, {
        statuses: options.statuses,
      });

    if (options.materialKey)
      queryBuilder.andWhere(
        `EXISTS (
          SELECT 1 FROM receive_inventory_order_items ri_items
          INNER JOIN materials ri_mat ON ri_mat.id = ri_items."materialId"
          WHERE ri_items."orderId" = orders.id
          AND ri_mat.key ILIKE :materialKey
        )`,
        { materialKey: `%${options.materialKey}%` },
      );

    if (options.batchKey)
      queryBuilder.andWhere(
        `EXISTS (
          SELECT 1 FROM receive_inventory_order_items ri_items
          INNER JOIN batches ri_batch ON ri_batch.id = ri_items."batchId"
          WHERE ri_items."orderId" = orders.id
          AND ri_batch.key ILIKE :batchKey
        )`,
        { batchKey: `%${options.batchKey}%` },
      );

    if (options.locationKey)
      queryBuilder.andWhere(
        `EXISTS (
          SELECT 1 FROM receive_inventory_order_items ri_items
          INNER JOIN locations ri_loc ON ri_loc.id = ri_items."locationId"
          WHERE ri_items."orderId" = orders.id
          AND ri_loc.key ILIKE :locationKey
        )`,
        { locationKey: `%${options.locationKey}%` },
      );

    if (options.loaderKey)
      queryBuilder.andWhere(
        `EXISTS (
          SELECT 1 FROM receive_inventory_order_items ri_items
          INNER JOIN loaders ri_ldr ON ri_ldr.id = ri_items."loaderId"
          WHERE ri_items."orderId" = orders.id
          AND ri_ldr."serialId" ILIKE :loaderKey
        )`,
        { loaderKey: `%${options.loaderKey}%` },
      );

    if (options.wildcard) {
      const { key, value } = options.wildcard;
      queryBuilder.andWhere(`orders."${String(key)}" ILIKE :value`, {
        value: `%${value}%`,
      });
    }

    const total = await queryBuilder.getCount();

    if (options.offset !== undefined && options.offset >= 0)
      queryBuilder.skip(options.offset);

    if (options.limit !== undefined && options.limit > 0)
      queryBuilder.take(options.limit);

    const items = await queryBuilder.getRawMany();

    return [items, total];
  }

  receive(
    options: ReceiveInventoryOrderInput[] | ReceiveInventoryOrderInput,
  ): Promise<boolean> {
    if (!Array.isArray(options)) options = [options];

    return this.dataSource.transaction(async (manager) => {
      const changeRepository =
        manager.getRepository<ReceiveInventoryOrderChangeEntityClass>(
          ReceiveInventoryOrderChangeEntityClass,
        );
      const itemRepository =
        manager.getRepository<ReceiveInventoryOrderItemEntityClass>(
          this.receiveInventoryOrderItemEntity,
        );
      const orderRepository = manager.getRepository<OrderEntity>(
        this.entities.order,
      );
      const locationRepository = manager.getRepository<LocationEntityClass>(
        this.entities.location,
      );
      const loaderRepository =
        manager.getRepository<LoadersEntityClass>(LoadersEntityClass);
      const stockRepository = manager.getRepository<StockEntityClass>(
        this.entities.stock,
      );

      const items = await itemRepository.find({
        where: { id: In(options.map((o) => o.itemId)) },
        relations: { changes: true },
      });
      const itemMap = new Map(items.map((i) => [i.id, i]));

      await Promise.all(
        options.map(async (option) => {
          const item = itemMap.get(option.itemId);
          if (!item) return;
          if (!item.batchId && option.batchKey) {
            // if batchKey is provided but item doesn't have batchId, attempt to find or create batch and update item with batchId
            item.batchId = await this.batchService
              .getBatch({
                manager,
                key: option.batchKey,
                materialId: item.materialId,
              })
              .then(async (b) => {
                await itemRepository.update({ id: item.id }, { batchId: b.id });
                return b.id;
              });
          }

          const conversionFactor =
            await this.materialService.getConversionFactor(
              item.materialId,
              item.unitId || undefined,
            );

          const totalChanged = item.changes.reduce(
            (sum, change) => sum + Number(change.quantityChanged),
            0,
          );

          const remainingQuantity =
            conversionFactor * item.targetReceivedQuantity - totalChanged;

          if (remainingQuantity - option.quantity * conversionFactor < 0) {
            throw new Error(
              `Receiving quantity exceeds target for item ${option.itemId}`,
            );
          }

          const newOrder = await orderRepository.save(orderRepository.create());
          let batchId = item.batchId;
          if (option.batchKey)
            batchId = await this.batchService
              .getBatch({
                manager,
                key: option.batchKey,
                materialId: item.materialId,
              })
              .then(({ id }) => id);
          if (!batchId)
            batchId = await this.batchService
              .getBatch({
                manager,
                key: await this.helperService.getSeq('BATCH'),
                materialId: item.materialId,
              })
              .then(({ id }) => id);

          const inspectionResult =
            item.requireInspection === false
              ? true
              : (option.inspectionResult ?? null);

          if (inspectionResult != null) {
            batchId = await this.batchService
              .splitBatch({
                manager,
                id: batchId as string,
                inspectionResult,
              })
              .then(({ id }) => id);
          } else if (item.requireInspection) {
            /*
             * Somebody asked for this to be inspected and it has not been yet.
             * Recording that on the batch is what lets `PENDING_INSPECTION`
             * mean "awaiting inspection" rather than "never inspected" -- the
             * latter being true of almost every batch in the warehouse.
             *
             * It splits, so material waiting on an inspection stops being
             * commingled with the free stock on the same batch key. That is the
             * same thing holding or shipping part of a batch already does.
             */
            batchId = await this.batchService
              .splitBatch({
                manager,
                id: batchId as string,
                requiresInspection: true,
              })
              .then(({ id }) => id);
          }

          let locationId = item.locationId;
          if (option.locationKey && !locationId)
            locationId = await locationRepository
              .findOneByOrFail({ key: option.locationKey })
              .then(({ id }) => id);

          let loaderId = item.loaderId;
          if (option.loaderKey && !loaderId)
            loaderId = await loaderRepository
              .findOneByOrFail({ serialId: option.loaderKey })
              .then(({ id }) => id);

          await Promise.all([
            changeRepository.save(
              changeRepository.create({
                itemId: option.itemId,
                quantityChanged: option.quantity * conversionFactor,
                id: newOrder.id,
              }),
            ),
            stockRepository.save(
              stockRepository.create({
                batchId: batchId || undefined,
                locationId: this.stockService.resolveLocationId(locationId),
                loaderId: this.stockService.resolveLoaderId(loaderId),
                materialId: item.materialId,
                quantity: option.quantity * conversionFactor,
                orderId: newOrder.id,
              }),
            ),
          ]);
        }),
      );

      return true;
    });
  }
}
