import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { type ReceiveInventoryOrderItemEntityClass } from './receive-inventory-order-item.entity';
import {
  ReceiveInventoryOrderStatus,
  ShipInventoryOrderStatus,
} from '../../../typings';

export const ReceiveInventoryOrderChangeEntity = Symbol(
  'ReceiveInventoryOrderChangeEntity',
);
@Entity('receive_inventory_order_changes')
export class ReceiveInventoryOrderChangeEntityClass {
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
    'receive_inventory_order_items',
    (item: ReceiveInventoryOrderItemEntityClass) => item.changes,
  )
  @JoinColumn({ name: 'itemId', referencedColumnName: 'id' })
  item!: ReceiveInventoryOrderItemEntityClass;

  @JoinColumn()
  status!: ReceiveInventoryOrderStatus;
}
