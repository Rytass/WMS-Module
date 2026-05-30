import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  TableInheritance,
} from 'typeorm';
import { AllocateInventoryOrderItemEntityClass } from './allocate-inventory-order-item.entity';

export const AllocateInventoryOrderEntity = Symbol(
  'AllocateInventoryOrderEntity',
);

@Entity('allocate_inventory_orders')
@TableInheritance({ column: { type: 'varchar', name: 'entityName' } })
export class AllocateInventoryOrderEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  @Index()
  key!: string;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @OneToMany(
    'allocate_inventory_order_items',
    (entity: AllocateInventoryOrderItemEntityClass) => entity.order,
  )
  items!: AllocateInventoryOrderItemEntityClass[];
}
