import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToMany,
  PrimaryGeneratedColumn,
  TableInheritance,
} from 'typeorm';
import { ShipInventoryOrderItemEntityClass } from './ship-inventory-order-item.entity';
import { ShipInventoryOrderStatus } from '../../../typings';

export const ShipInventoryOrderEntity = Symbol('ShipInventoryOrderEntity');

@Entity('ship_inventory_orders')
@TableInheritance({ column: { type: 'varchar', name: 'entityName' } })
export class ShipInventoryOrderEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  @Index()
  key!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'varchar', nullable: true })
  createdBy!: string;

  @Column({ type: 'timestamptz', nullable: true })
  removedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(
    'ship_inventory_order_items',
    (entity: ShipInventoryOrderItemEntityClass) => entity.order,
  )
  @JoinColumn({ name: 'id', referencedColumnName: 'orderId' })
  items!: ShipInventoryOrderItemEntityClass[];

  @JoinColumn()
  status!: ShipInventoryOrderStatus;
}
