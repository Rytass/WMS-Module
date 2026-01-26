import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  TableInheritance,
} from 'typeorm';
import { HoldInventoryOrderItemEntityClass } from './hold-inventory-order-item.entity';

export const HoldInventoryOrderEntity = Symbol('HoldInventoryOrderEntity');

@Entity('hold_inventory_orders')
@TableInheritance({ column: { type: 'varchar', name: 'entityName' } })
export class HoldInventoryOrderEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  @Index()
  key!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'varchar' })
  reason!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(
    'hold_inventory_order_items',
    (entity: HoldInventoryOrderItemEntityClass) => entity.order,
  )
  items!: HoldInventoryOrderItemEntityClass[];
}
