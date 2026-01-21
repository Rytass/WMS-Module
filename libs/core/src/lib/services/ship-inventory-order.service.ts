import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import {
  ShipInventoryOrderEntity,
  ShipInventoryOrderEntityClass,
} from '../models/extensions/ship-inventory-order/ship-inventory-order.entity';
import {
  ShipInventoryOrderItemEntity,
  ShipInventoryOrderItemEntityClass,
} from '../models/extensions/ship-inventory-order/ship-inventory-order-item.entity';
import {
  DataSource,
  EntityManager,
  In,
  IsNull,
  Repository,
  type EntityTarget,
} from 'typeorm';
import {
  CreateShipInventoryOrderInput,
  UpdateShipInventoryOrderInput,
} from '../typings/create-ship-inventory-order.input';
import {
  FindShipInventoryOrderInput,
  ShipInventoryOrderStatus,
} from '../typings/find-ship-inventory-order.input';
import { OrderEntity, StockEntity } from '@rytass/wms-base-nestjs-module';
import { ShipInventoryOrderChangeEntityClass } from '../models';
import { ShipInventoryOrderInput } from '../typings/ship-inventory-order.input';

/**
 * Service for managing ship inventory orders and their items
 * Supports dynamic entity injection for customization
 * T - Ship Inventory Order entity type
 * K - Ship Inventory Order Item entity type
 */
@Injectable()
export class ShipInventoryOrderService<
  T extends ShipInventoryOrderEntityClass = ShipInventoryOrderEntityClass,
  K extends
    ShipInventoryOrderItemEntityClass = ShipInventoryOrderItemEntityClass,
> implements OnApplicationBootstrap
{
  readonly shipInventoryOrderRepository: Repository<T>;
  constructor(
    private readonly dataSource: DataSource,
    @Inject(ShipInventoryOrderEntity)
    readonly shipInventoryOrderEntity: EntityTarget<T>,
    @Inject(ShipInventoryOrderItemEntity)
    readonly shipInventoryOrderItemEntity: EntityTarget<K>,
  ) {
    this.shipInventoryOrderRepository = this.dataSource.getRepository<T>(
      this.shipInventoryOrderEntity,
    );
  }

  async onApplicationBootstrap() {
    await this.createTrigger();
  }

  async createTrigger(): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.query(`
        DROP TRIGGER IF EXISTS ship_inventory_order_changes_insert ON ship_inventory_order_changes;
        DROP TRIGGER IF EXISTS ship_inventory_order_changes_update ON ship_inventory_order_changes;
        DROP TRIGGER IF EXISTS ship_inventory_order_changes_delete ON ship_inventory_order_changes;
        DROP TRIGGER IF EXISTS ship_inventory_order_removed ON ship_inventory_orders;
        DROP FUNCTION IF EXISTS update_ship_inventory_order_status();
      `);

      await queryRunner.query(`
        CREATE OR REPLACE FUNCTION update_ship_inventory_order_status()
        RETURNS TRIGGER AS $$
        DECLARE
          v_removed_at TIMESTAMPTZ;
          v_total_shipped NUMERIC;
          v_total_target NUMERIC;
          v_new_status VARCHAR;
        BEGIN
          SELECT "removedAt" INTO v_removed_at
          FROM ship_inventory_orders
          WHERE id = COALESCE(NEW."orderId", OLD."orderId");

          IF v_removed_at IS NOT NULL THEN
            v_new_status := 'REMOVED';
          ELSE
            SELECT COALESCE(SUM(c.quantity), 0)
            INTO v_total_shipped
            FROM ship_inventory_order_changes c
            JOIN ship_inventory_order_items i ON c."itemId" = i.id
            WHERE i."orderId" = COALESCE(NEW."orderId", OLD."orderId");

            SELECT COALESCE(SUM("targetShippedQuantity"), 0)
            INTO v_total_target
            FROM ship_inventory_order_items
            WHERE "orderId" = COALESCE(NEW."orderId", OLD."orderId");

            IF v_total_shipped = v_total_target AND v_total_target > 0 THEN
              v_new_status := 'SHIPPED';
            ELSIF v_total_shipped > 0 AND v_total_shipped < v_total_target THEN
              v_new_status := 'PARTIAL_SHIPPED';
            ELSE
              v_new_status := 'PENDING';
            END IF;
          END IF;

          UPDATE ship_inventory_orders
          SET status = v_new_status
          WHERE id = COALESCE(NEW."orderId", OLD."orderId");

          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);
      await queryRunner.query(`
        CREATE TRIGGER ship_inventory_order_changes_insert
        AFTER INSERT ON ship_inventory_order_changes
        FOR EACH ROW
        EXECUTE FUNCTION update_ship_inventory_order_status();
      `);

      await queryRunner.query(`
        CREATE TRIGGER ship_inventory_order_changes_update
        AFTER UPDATE ON ship_inventory_order_changes
        FOR EACH ROW
        EXECUTE FUNCTION update_ship_inventory_order_status();
      `);

      await queryRunner.query(`
        CREATE TRIGGER ship_inventory_order_changes_delete
        AFTER DELETE ON ship_inventory_order_changes
        FOR EACH ROW
        EXECUTE FUNCTION update_ship_inventory_order_status();
      `);

      await queryRunner.query(`
        CREATE TRIGGER ship_inventory_order_removed
        AFTER UPDATE OF "removedAt" ON ship_inventory_orders
        FOR EACH ROW
        EXECUTE FUNCTION update_ship_inventory_order_status();
      `);

      Logger.log(
        '✅ Ship inventory order status triggers created successfully',
        'PostgreSQL',
      );
    } catch (error) {
      Logger.error(
        `❌ Failed to create ship inventory order triggers: ${error}`,
        'PostgreSQL',
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async createShipInventoryOrder({
    manager = this.dataSource.manager,
    ...options
  }: CreateShipInventoryOrderInput & { manager?: EntityManager }): Promise<T> {
    const orderRepository = manager.getRepository<OrderEntity>(OrderEntity);
    const shipInventoryOrderRepository =
      manager.getRepository<ShipInventoryOrderEntityClass>(
        this.shipInventoryOrderEntity,
      );
    const shipInventoryOrderItemRepository =
      manager.getRepository<ShipInventoryOrderItemEntityClass>(
        this.shipInventoryOrderItemEntity,
      );

    // create base order
    const { id } = await orderRepository.save(orderRepository.create());

    // create ship inventory order
    const order = await shipInventoryOrderRepository.save(
      shipInventoryOrderRepository.create({ id, ...options }),
    );

    // create ship inventory order items
    if (options.items && options.items.length > 0) {
      const items = shipInventoryOrderItemRepository.create(
        options.items.map((item) => ({
          ...item,
          orderId: order.id,
        })),
      );
      await shipInventoryOrderItemRepository.save(items);
    }

    return order as T;
  }

  /**
   * Update a ship inventory order and its items
   * update existing item when id is provided, otherwise create new item, remove behaviour controlled by removedAt field
   */
  async updateShipInventoryOrder({
    id,
    manager = this.dataSource.manager,
    ...options
  }: UpdateShipInventoryOrderInput & { manager?: EntityManager }): Promise<T> {
    const shipInventoryOrderRepository =
      manager.getRepository<ShipInventoryOrderEntityClass>(
        this.shipInventoryOrderEntity,
      );
    const shipInventoryOrderItemRepository =
      manager.getRepository<ShipInventoryOrderItemEntityClass>(
        this.shipInventoryOrderItemEntity,
      );

    const order = await shipInventoryOrderRepository.findOneByOrFail({
      id,
      removedAt: IsNull(),
    });
    const updated = await shipInventoryOrderRepository.save(
      shipInventoryOrderRepository.create({
        ...order,
        ...options,
      }),
    );

    if (options.items?.length) {
      const newItems: Partial<ShipInventoryOrderItemEntityClass>[] = [];
      const existingItems: Partial<ShipInventoryOrderItemEntityClass>[] = [];

      await shipInventoryOrderItemRepository
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
        await shipInventoryOrderItemRepository.save(
          shipInventoryOrderItemRepository.create(
            newItems.map((item) => ({ ...item, orderId: id })),
          ),
        );
      if (existingItems.length)
        await Promise.all(
          existingItems.map(async (item) =>
            shipInventoryOrderItemRepository.update({ id: item.id }, item),
          ),
        );
    }

    return updated as T;
  }

  async removeShipInventoryOrder(id: string): Promise<boolean> {
    return this.dataSource
      .getRepository<ShipInventoryOrderEntityClass>(
        this.shipInventoryOrderEntity,
      )
      .update({ id }, { removedAt: new Date() })
      .then(({ affected }) => !!affected && affected > 0);
  }

  findMany(options: FindShipInventoryOrderInput): Promise<[T[], number]> {
    const queryBuilder = this.dataSource
      .getRepository<T>(this.shipInventoryOrderEntity)
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

    if (options.status)
      queryBuilder.andWhere('order.status = :status', {
        status: options.status,
      });

    if (options.offset !== undefined && options.offset >= 0)
      queryBuilder.skip(options.offset);

    if (options.limit !== undefined && options.limit > 0)
      queryBuilder.take(options.limit);

    return queryBuilder.getManyAndCount();
  }

  ship(
    options: ShipInventoryOrderInput[] | ShipInventoryOrderInput,
  ): Promise<boolean> {
    if (!Array.isArray(options)) options = [options];
    return this.dataSource.transaction(async (manager) => {
      const changeRepository =
        manager.getRepository<ShipInventoryOrderChangeEntityClass>(
          ShipInventoryOrderChangeEntityClass,
        );
      const itemRepository =
        manager.getRepository<ShipInventoryOrderItemEntityClass>(
          this.shipInventoryOrderItemEntity,
        );

      const orderRepository = manager.getRepository<OrderEntity>(OrderEntity);
      const stockRepository = manager.getRepository<StockEntity>(StockEntity);

      const items = await itemRepository.find({
        where: { id: In(options.map((option) => option.itemId)) },
        relations: ['order'],
      });
      const itemMap = new Map(items.map((item) => [item.id, item]));
      await Promise.all(
        options.map(async (option) => {
          const item = itemMap.get(option.itemId);
          if (!item) return;

          const totalChanged = item.changes.reduce(
            (sum, change) => sum + Number(change.quantityChanged),
            0,
          );

          if (totalChanged + option.quantity > item.targetShippedQuantity) {
            throw new Error(
              `Shipped quantity exceeds target for item ${option.itemId}`,
            );
          }

          if (!item.batchId)
            throw new Error(`Item ${option.itemId} has no batch assigned`);

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
                batchId: item.batchId,
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
