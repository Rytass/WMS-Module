import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AllocateInventoryOrderItemEntityClass } from './allocate-inventory-order-item.entity';
import { BaseOrderChangeEntityClass } from '../base-order-change.entity';

export const AllocateInventoryOrderChangeEntity = Symbol(
  'AllocateInventoryOrderChangeEntity',
);
@Entity('allocate_inventory_order_changes')
export class AllocateInventoryOrderChangeEntityClass extends BaseOrderChangeEntityClass {
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
    'allocate_inventory_order_items',
    (item: AllocateInventoryOrderItemEntityClass) => item.changes,
  )
  @JoinColumn({ name: 'itemId', referencedColumnName: 'id' })
  item!: AllocateInventoryOrderItemEntityClass;
}
