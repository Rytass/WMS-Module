import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  TableInheritance,
} from 'typeorm';
import { ReleaseInventoryOrderItemEntityClass } from './release-inventory-order-item.entity';

export const ReleaseInventoryOrderEntity = Symbol(
  'ReleaseInventoryOrderEntity',
);

@Entity('release_inventory_orders')
@TableInheritance({ column: { type: 'varchar', name: 'entityName' } })
export class ReleaseInventoryOrderEntityClass {
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
    'release_inventory_order_items',
    (entity: ReleaseInventoryOrderItemEntityClass) => entity.order,
  )
  items!: ReleaseInventoryOrderItemEntityClass[];
}
