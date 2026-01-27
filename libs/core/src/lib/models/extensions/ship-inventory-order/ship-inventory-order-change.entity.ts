import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { type ShipInventoryOrderItemEntityClass } from './ship-inventory-order-item.entity';
import { ShipInventoryOrderStatus } from '../../../typings';

export const ShipInventoryOrderChangeEntity = Symbol(
  'ShipInventoryOrderChangeEntity',
);
@Entity('ship_inventory_order_changes')
export class ShipInventoryOrderChangeEntityClass {
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
    'ship_inventory_order_items',
    (item: ShipInventoryOrderItemEntityClass) => item.changes,
  )
  @JoinColumn({ name: 'itemId', referencedColumnName: 'id' })
  item!: ShipInventoryOrderItemEntityClass;

  @JoinColumn()
  status!: ShipInventoryOrderStatus;
}
