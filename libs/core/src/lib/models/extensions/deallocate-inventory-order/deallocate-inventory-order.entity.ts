import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  TableInheritance,
} from 'typeorm';
import { DeallocateInventoryOrderItemEntityClass } from './deallocate-inventory-order-item.entity';

export const DeallocateInventoryOrderEntity = Symbol(
  'DeallocateInventoryOrderEntity',
);

@Entity('deallocate_inventory_orders')
@TableInheritance({ column: { type: 'varchar', name: 'entityName' } })
export class DeallocateInventoryOrderEntityClass {
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
    'deallocate_inventory_order_items',
    (entity: DeallocateInventoryOrderItemEntityClass) => entity.order,
  )
  items!: DeallocateInventoryOrderItemEntityClass[];
}
