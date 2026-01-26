import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DeallocateInventoryOrderItemEntityClass } from './deallocate-inventory-order-item.entity';

export const DeallocateInventoryOrderChangeEntity = Symbol(
  'DeallocateInventoryOrderChangeEntity',
);
@Entity('deallocate_inventory_order_changes')
export class DeallocateInventoryOrderChangeEntityClass {
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
    'deallocate_inventory_order_items',
    (item: DeallocateInventoryOrderItemEntityClass) => item.changes,
  )
  @JoinColumn({ name: 'itemId', referencedColumnName: 'id' })
  item!: DeallocateInventoryOrderItemEntityClass;
}
