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
import { SplitBatchOrderEntityClass } from './split-batch-order.entity';
import { SplitBatchOrderChangeEntityClass } from './split-batch-order-change.entity';

export const SplitBatchOrderItemEntity = Symbol('SplitBatchOrderItemEntity');
@Entity('split_batch_order_items')
@TableInheritance({ column: { type: 'varchar', name: 'entityName' } })
export class SplitBatchOrderItemEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  locationId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  loaderId!: string | null;

  @Column({ type: 'numeric' })
  targetSplitQuantity!: number;

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
    'split_batch_orders',
    (entity: SplitBatchOrderEntityClass) => entity.items,
  )
  @JoinColumn({ name: 'orderId', referencedColumnName: 'id' })
  order!: SplitBatchOrderEntityClass;

  @ManyToOne(
    'split_batch_order_changes',
    (change: SplitBatchOrderChangeEntityClass) => change.item,
  )
  changes!: SplitBatchOrderChangeEntityClass[];
}
