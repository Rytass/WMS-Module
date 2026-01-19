import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ReceiveInventoryOrderItemEntityClass } from './receive-inventory-order-item.entity';

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

  @ManyToOne(() => ReceiveInventoryOrderItemEntityClass)
  @JoinColumn({ name: 'itemId', referencedColumnName: 'id' })
  item!: ReceiveInventoryOrderItemEntityClass;
}
