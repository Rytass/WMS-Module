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

  @Column({ type: 'varchar', nullable: true })
  createdBy!: string | null;

  @Column({ type: 'datetime', nullable: true })
  removedAt!: Date | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @OneToMany(
    'hold_inventory_order_items',
    (entity: HoldInventoryOrderItemEntityClass) => entity.order,
  )
  items!: HoldInventoryOrderItemEntityClass[];
}
