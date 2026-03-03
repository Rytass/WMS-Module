import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { HoldInventoryOrderItemEntityClass } from './hold-inventory-order-item.entity';
import { BaseOrderChangeEntityClass } from '../base-order-change.entity';

export const HoldInventoryOrderChangeEntity = Symbol(
  'HoldInventoryOrderChangeEntity',
);
@Entity('hold_inventory_order_changes')
export class HoldInventoryOrderChangeEntityClass extends BaseOrderChangeEntityClass {
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
    'hold_inventory_order_items',
    (item: HoldInventoryOrderItemEntityClass) => item.changes,
    { onDelete: 'CASCADE', orphanedRowAction: 'delete' },
  )
  @JoinColumn({ name: 'itemId', referencedColumnName: 'id' })
  item!: HoldInventoryOrderItemEntityClass;
}
