import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MergeBatchOrderItemEntityClass } from './merge-batch-order-item.entity';

export const MergeBatchOrderChangeEntity = Symbol('MergeBatchOrderChangeEntity');
@Entity('merge_batch_order_changes')
export class MergeBatchOrderChangeEntityClass {
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
    'merge_batch_order_items',
    (item: MergeBatchOrderItemEntityClass) => item.changes,
  )
  @JoinColumn({ name: 'itemId', referencedColumnName: 'id' })
  item!: MergeBatchOrderItemEntityClass;
}
