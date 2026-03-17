import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  TableInheritance,
} from 'typeorm';
import { MergeBatchOrderItemEntityClass } from './merge-batch-order-item.entity';

export const MergeBatchOrderEntity = Symbol('MergeBatchOrderEntity');

@Entity('merge_batch_orders')
@TableInheritance({ column: { type: 'varchar', name: 'entityName' } })
export class MergeBatchOrderEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  @Index()
  key!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(
    'merge_batch_order_items',
    (entity: MergeBatchOrderItemEntityClass) => entity.order,
  )
  items!: MergeBatchOrderItemEntityClass[];
}
