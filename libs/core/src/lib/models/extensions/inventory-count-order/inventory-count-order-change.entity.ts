import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { InventoryCountOrderItemEntityClass } from './inventory-count-order-item.entity';

export const InventoryCountOrderChangeEntity = Symbol(
  'InventoryCountOrderChangeEntity',
);

/**
 * The stock movement a settled count line produced.
 *
 * `quantityChanged` carries the sign, exactly like every other `*_order_change`
 * table: positive is a surplus (盤盈), negative a shortage (盤虧).
 * `StockChangeSubscriber` reads the sign to pick between `stock.count-gained`
 * and `stock.count-lost`, so nothing here has to emit events itself.
 *
 * Lines whose count matched the books produce no row at all.
 */
@Entity('inventory_count_order_changes')
export class InventoryCountOrderChangeEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  itemId!: string;

  @Column({ type: 'numeric' })
  quantityChanged!: number;

  @OneToOne('orders')
  @JoinColumn({ name: 'id', referencedColumnName: 'id' })
  order!: OrderEntity;

  @ManyToOne(
    'inventory_count_order_items',
    (item: InventoryCountOrderItemEntityClass) => item.changes,
  )
  @JoinColumn({ name: 'itemId', referencedColumnName: 'id' })
  item!: InventoryCountOrderItemEntityClass;
}
