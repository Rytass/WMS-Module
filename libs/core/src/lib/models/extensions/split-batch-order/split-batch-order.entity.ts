import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  TableInheritance,
} from 'typeorm';
import { SplitBatchOrderItemEntityClass } from './split-batch-order-item.entity';

export const SplitBatchOrderEntity = Symbol('SplitBatchOrderEntity');

@Entity('split_batch_orders')
@TableInheritance({ column: { type: 'varchar', name: 'entityName' } })
export class SplitBatchOrderEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  @Index()
  key!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(
    'split_batch_order_items',
    (entity: SplitBatchOrderItemEntityClass) => entity.order,
  )
  items!: SplitBatchOrderItemEntityClass[];
}
