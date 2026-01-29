import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SplitBatchOrderItemEntityClass } from './split-batch-order-item.entity';

export const SplitBatchOrderChangeEntity = Symbol(
  'SplitBatchOrderChangeEntity',
);
@Entity('split_batch_order_changes')
export class SplitBatchOrderChangeEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  itemId!: string;

  @Column({ type: 'numeric' })
  quantityChanged!: number;

  @OneToOne('orders')
  @JoinColumn({ name: 'id', referencedColumnName: 'id' })
  order!: OrderEntity;

  @ManyToOne(
    'split_batch_order_items',
    (item: SplitBatchOrderItemEntityClass) => item.changes,
  )
  @JoinColumn({ name: 'itemId', referencedColumnName: 'id' })
  item!: SplitBatchOrderItemEntityClass;
}
