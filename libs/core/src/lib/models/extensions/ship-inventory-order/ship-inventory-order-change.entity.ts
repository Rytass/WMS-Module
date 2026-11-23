import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ShipChangeKind } from '../../../constants/ship-change-kind';
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

  /**
   * Which of the three actions wrote this row. A ship and a cancel are both
   * negative, so the sign cannot carry it -- see {@link ShipChangeKind}.
   *
   * Nullable only so a table that already holds rows can gain the column; the
   * integration guide's upgrade SQL fills it. Every write sets it.
   */
  @Column({ type: 'varchar', nullable: true })
  kind!: ShipChangeKind | null;

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
