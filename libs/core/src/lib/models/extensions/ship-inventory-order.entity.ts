import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  TableInheritance,
} from 'typeorm';
import { ShipInventoryOrderItemEntityClass } from './ship-inventory-order-item.entity';

export const ShipInventoryOrderEntity = Symbol('ShipInventoryOrderEntity');

@Entity('ship_inventory_orders')
@TableInheritance({ column: { type: 'varchar', name: 'entityName' } })
export class ShipInventoryOrderEntityClass {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'varchar' })
  createdBy!: string;

  @Column({ type: 'timestamptz', nullable: true })
  removedAt!: Date | null;

  @OneToOne('orders')
  @JoinColumn({ name: 'id', referencedColumnName: 'id' })
  order!: OrderEntity;

  @OneToMany(
    'ship_inventory_order_items',
    (entity: ShipInventoryOrderItemEntityClass) => entity.order
  )
  @JoinColumn({ name: 'id', referencedColumnName: 'orderId' })
  items!: ShipInventoryOrderItemEntityClass[];
}
