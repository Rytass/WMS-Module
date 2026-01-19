import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ShipInventoryOrderItemEntityClass } from './ship-inventory-order-item.entity';

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

  @ManyToOne(() => ShipInventoryOrderItemEntityClass)
  @JoinColumn({ name: 'itemId', referencedColumnName: 'id' })
  item!: ShipInventoryOrderItemEntityClass;
}
