import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
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
  EntityManager,
  In,
  IsNull,
  Repository,
  type EntityTarget,
} from 'typeorm';
import {
  CreateReceiveInventoryOrderInput,
  UpdateReceiveInventoryOrderInput,
} from '../typings/create-receive-inventory-order.input';
import { OrderEntity, StockEntity } from '@rytass/wms-base-nestjs-module';
import {
  FindReceiveInventoryOrderInput,
  ReceiveInventoryOrderStatus,
} from '../typings/find-receive-inventory-order.input';
import { ReceiveInventoryOrderChangeEntityClass } from '../models';
import { ReceiveInventoryOrderInput } from '../typings/receive-inventory-order.input';

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
> implements OnApplicationBootstrap
{
  readonly receiveInventoryOrderRepository: Repository<T>;
  constructor(
    private readonly dataSource: DataSource,
    @Inject(ReceiveInventoryOrderEntity)
    readonly receiveInventoryOrderEntity: EntityTarget<T>,
    @Inject(ReceiveInventoryOrderItemEntity)
    readonly receiveInventoryOrderItemEntity: EntityTarget<K>,
  ) {
    this.receiveInventoryOrderRepository = this.dataSource.getRepository<T>(
      this.receiveInventoryOrderEntity,
    );
  }

  async onApplicationBootstrap() {
    await this.createReceiveInventoryOrderTriggers();
  }

  private async createReceiveInventoryOrderTriggers() {
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.query(`
        DROP TRIGGER IF EXISTS receive_inventory_order_changes_insert ON receive_inventory_order_changes;
        DROP TRIGGER IF EXISTS receive_inventory_order_changes_update ON receive_inventory_order_changes;
        DROP TRIGGER IF EXISTS receive_inventory_order_changes_delete ON receive_inventory_order_changes;
        DROP TRIGGER IF EXISTS receive_inventory_order_removed ON receive_inventory_orders;
        DROP FUNCTION IF EXISTS update_receive_inventory_order_status();
      `);

      await queryRunner.query(`
        CREATE OR REPLACE FUNCTION update_receive_inventory_order_status()
        RETURNS TRIGGER AS $$
        DECLARE
          v_removed_at TIMESTAMPTZ;
          v_total_received NUMERIC;
          v_total_target NUMERIC;
          v_new_status VARCHAR;
        BEGIN
          SELECT "removedAt" INTO v_removed_at
          FROM receive_inventory_orders
          WHERE id = COALESCE(NEW."orderId", OLD."orderId");

          IF v_removed_at IS NOT NULL THEN
            v_new_status := 'REMOVED';
          ELSE
            SELECT COALESCE(SUM(c.quantity), 0)
            INTO v_total_received
            FROM receive_inventory_order_changes c
            JOIN receive_inventory_order_items i ON c."itemId" = i.id
            WHERE i."orderId" = COALESCE(NEW."orderId", OLD."orderId");

            SELECT COALESCE("targetReceivedQuantity", 0)
            INTO v_total_target
            FROM receive_inventory_orders
            WHERE id = COALESCE(NEW."orderId", OLD."orderId");

            IF v_total_received = v_total_target AND v_total_target > 0 THEN
              v_new_status := 'SHIPPED';
            ELSIF v_total_received > 0 AND v_total_received < v_total_target THEN
              v_new_status := 'PARTIAL_SHIPPED';
            ELSE
              v_new_status := 'PENDING';
            END IF;
          END IF;

          UPDATE receive_inventory_orders
          SET status = v_new_status
          WHERE id = COALESCE(NEW."orderId", OLD."orderId");

          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);

      // Pratically, only when change is created will have the status updated,
      // but keep all for manual database changes possibility
      await queryRunner.query(`
        CREATE TRIGGER receive_inventory_order_changes_insert
        AFTER INSERT ON receive_inventory_order_changes
        FOR EACH ROW
        EXECUTE FUNCTION update_receive_inventory_order_status();
      `);

      await queryRunner.query(`
        CREATE TRIGGER receive_inventory_order_changes_update
        AFTER UPDATE ON receive_inventory_order_changes
        FOR EACH ROW
        EXECUTE FUNCTION update_receive_inventory_order_status();
      `);

      await queryRunner.query(`
        CREATE TRIGGER receive_inventory_order_changes_delete
        AFTER DELETE ON receive_inventory_order_changes
        FOR EACH ROW
        EXECUTE FUNCTION update_receive_inventory_order_status();
      `);

      await queryRunner.query(`
        CREATE TRIGGER receive_inventory_order_removed
        AFTER UPDATE OF "removedAt" ON receive_inventory_orders
        FOR EACH ROW
        EXECUTE FUNCTION update_receive_inventory_order_status();
      `);

      Logger.log(
        '✅ Receive inventory order status triggers created successfully',
        'PostgreSQL',
      );
    } catch (error) {
      Logger.error(
        `❌ Failed to create receive inventory order triggers: ${error}`,
        'PostgreSQL',
        error,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async createReceiveInventoryOrder({
    manager = this.dataSource.manager,
    ...options
  }: CreateReceiveInventoryOrderInput & {
    manager?: EntityManager;
  }): Promise<T> {
    const orderRepository = manager.getRepository<OrderEntity>(OrderEntity);
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
    const order = await receiveInventoryOrderRepository.save(
      receiveInventoryOrderRepository.create({ id, ...options }),
    );

    // create receive inventory order items
    if (options.items && options.items.length > 0) {
      const items = receiveInventoryOrderItemRepository.create(
        options.items.map((item) => ({
          ...item,
          orderId: order.id,
        })),
      );
      await receiveInventoryOrderItemRepository.save(items);
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
    const updated = await receiveInventoryOrderRepository.save(
      receiveInventoryOrderRepository.create({
        ...order,
        ...options,
      }),
    );

    if (options.items?.length) {
      const newItems: Partial<ReceiveInventoryOrderItemEntityClass>[] = [];
      const existingItems: Partial<ReceiveInventoryOrderItemEntityClass>[] = [];

      await receiveInventoryOrderItemRepository
        .find({ where: { orderId: id } })
        .then((items) => {
          const itemSet = new Set(items.map((i) => i.id));
          options.items?.forEach((item) => {
            if (item.removedAt) return;

            if (!item.id) newItems.push(item);
            else if (itemSet.has(item.id)) existingItems.push(item);
          });
        });

      if (newItems.length)
        await receiveInventoryOrderItemRepository.save(
          receiveInventoryOrderItemRepository.create(
            newItems.map((item) => ({ ...item, orderId: id })),
          ),
        );
      if (existingItems.length)
        await Promise.all(
          existingItems.map(async (item) =>
            receiveInventoryOrderItemRepository.update({ id: item.id }, item),
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

  findMany(options: FindReceiveInventoryOrderInput): Promise<[T[], number]> {
    const queryBuilder = this.dataSource
      .getRepository<T>(this.receiveInventoryOrderEntity)
      .createQueryBuilder('order');

    if (options.id) queryBuilder.andWhere('order.id = :id', { id: options.id });

    if (options.createdBy)
      queryBuilder.andWhere('order."createdBy" ILIKE :createdBy', {
        createdBy: `%${options.createdBy}%`,
      });

    if (options.description)
      queryBuilder.andWhere('order.description ILIKE :description', {
        description: `%${options.description}%`,
      });

    if (options.dateRange)
      queryBuilder.andWhere('order."createdAt" BETWEEN :from AND :to', {
        from: options.dateRange.from,
        to: options.dateRange.to,
      });

    if (options.status) {
      switch (options.status) {
        case ReceiveInventoryOrderStatus.REMOVED:
          queryBuilder.andWhere('order."removedAt" IS NOT NULL');
          break;

        case ReceiveInventoryOrderStatus.RECEIVED:
          queryBuilder.innerJoin(
            (qb) =>
              qb
                .from(ReceiveInventoryOrderItemEntityClass, 'item')
                .select('item."orderId"', 'orderId')
                .addSelect(
                  'SUM(item."targetReceivedQuantity")',
                  'totalTargetReceivedQuantity',
                )
                .addSelect(
                  'SUM(item."actualReceivedQuantity")',
                  'totalActualReceivedQuantity',
                )
                .groupBy('item."orderId"'),
            'summary',
            'summary."orderId" = order.id AND summary."totalTargetReceivedQuantity" = summary."totalActualReceivedQuantity"',
          );
          break;

        case ReceiveInventoryOrderStatus.PARTIAL_RECEIVED:
          queryBuilder.innerJoin(
            (qb) =>
              qb
                .from(ReceiveInventoryOrderItemEntityClass, 'item')
                .addSelect('item."orderId"', 'orderId')
                .addSelect(
                  'SUM(item."targetReceivedQuantity")',
                  'totalTargetReceivedQuantity',
                )
                .addSelect(
                  'SUM(item."actualReceivedQuantity")',
                  'totalActualReceivedQuantity',
                )
                .groupBy('item."orderId"'),
            'summary',
            'summary."orderId" = order.id AND summary."totalActualReceivedQuantity" > 0 AND summary."totalActualReceivedQuantity" < summary."totalTargetReceivedQuantity"',
          );

          break;

        case ReceiveInventoryOrderStatus.PENDING:
          queryBuilder.innerJoin(
            (qb) =>
              qb
                .from(ReceiveInventoryOrderItemEntityClass, 'item')
                .addSelect('item."orderId"', 'orderId')
                .addSelect(
                  'SUM(item."actualReceivedQuantity")',
                  'totalActualReceivedQuantity',
                )
                .groupBy('item."orderId"'),
            'summary',
            'summary."orderId" = order.id AND summary."totalActualReceivedQuantity" = 0',
          );

          break;
      }
    }

    if (options.offset !== undefined && options.offset >= 0)
      queryBuilder.skip(options.offset);

    if (options.limit !== undefined && options.limit > 0)
      queryBuilder.take(options.limit);

    return queryBuilder.getManyAndCount();
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
      const orderRepository = manager.getRepository<OrderEntity>(OrderEntity);
      const stockRepository = manager.getRepository<StockEntity>(StockEntity);

      const items = await itemRepository.find({
        where: { id: In(options.map((o) => o.itemId)) },
        relations: ['changes'],
      });
      const itemMap = new Map(items.map((i) => [i.id, i]));

      await Promise.all(
        options.map(async (option) => {
          const item = itemMap.get(option.itemId);
          if (!item) return;

          const totalChanged = item.changes.reduce(
            (sum, change) => sum + Number(change.quantityChanged),
            0,
          );

          if (totalChanged + option.quantity > item.targetReceivedQuantity) {
            throw new Error(
              `Receiving quantity exceeds target for item ${option.itemId}`,
            );
          }

          const newOrder = await orderRepository.save(orderRepository.create());

          await Promise.all([
            changeRepository.save(
              changeRepository.create({
                itemId: option.itemId,
                quantityChanged: option.quantity,
                id: newOrder.id,
              }),
            ),
            stockRepository.save(
              stockRepository.create({
                batchId: option.batchId ?? item.batchId,
                materialId: item.materialId,
                quantity: option.quantity,
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
