import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  TableInheritance,
} from 'typeorm';
import { ReclassifyInventoryOrderItemEntityClass } from './reclassify-inventory-order-item.entity';

export const ReclassifyInventoryOrderEntity = Symbol(
  'ReclassifyInventoryOrderEntity',
);

@Entity('reclassify_inventory_orders')
@TableInheritance({ column: { type: 'varchar', name: 'entityName' } })
export class ReclassifyInventoryOrderEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  @Index()
  key!: string;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @OneToMany(
    'reclassify_inventory_order_items',
    (entity: ReclassifyInventoryOrderItemEntityClass) => entity.order,
  )
  items!: ReclassifyInventoryOrderItemEntityClass[];
}
