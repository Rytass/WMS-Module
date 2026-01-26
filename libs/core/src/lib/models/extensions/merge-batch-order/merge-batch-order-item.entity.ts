import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  TableInheritance,
} from 'typeorm';
import { LoadersEntityClass, LocationEntityClass } from '../../metadata';
import { MergeBatchOrderEntityClass } from './merge-batch-order.entity';
import { MergeBatchOrderChangeEntityClass } from './merge-batch-order-change.entity';

export const MergeBatchOrderItemEntity = Symbol('MergeBatchOrderItemEntity');
@Entity('merge_batch_order_items')
@TableInheritance({ column: { type: 'varchar', name: 'entityName' } })
export class MergeBatchOrderItemEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  locationId!: string;

  @Column({ type: 'uuid', nullable: true })
  loaderId!: string | null;

  @Column({ type: 'numeric' })
  targetMergedQuantity!: number;

  @Column({ type: 'uuid' })
  @Index()
  orderId!: string;

  @ManyToOne('locations')
  @JoinColumn({ name: 'locationId', referencedColumnName: 'id' })
  location!: LocationEntityClass;

  @ManyToOne('loaders')
  @JoinColumn({ name: 'loaderId', referencedColumnName: 'id' })
  loader!: LoadersEntityClass;

  @ManyToOne(
    'merge_batch_orders',
    (entity: MergeBatchOrderEntityClass) => entity.items,
  )
  @JoinColumn({ name: 'orderId', referencedColumnName: 'id' })
  order!: MergeBatchOrderEntityClass;

  @ManyToOne(
    'merge_batch_order_changes',
    (change: MergeBatchOrderChangeEntityClass) => change.item,
  )
  changes!: MergeBatchOrderChangeEntityClass[];
}
