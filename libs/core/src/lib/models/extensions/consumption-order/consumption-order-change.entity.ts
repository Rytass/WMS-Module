import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ConsumptionChangeKind } from '../../../constants/consumption-change-kind';
import { ConsumptionOrderItemEntityClass } from './consumption-order-item.entity';

export const ConsumptionOrderChangeEntity = Symbol(
  'ConsumptionOrderChangeEntity',
);

@Entity('consumption_order_changes')
export class ConsumptionOrderChangeEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  itemId!: string;

  /** Positive for an issue, negative for a return or a settlement. */
  @Column({ type: 'numeric' })
  quantityChanged!: number;

  /**
   * Which of the three actions wrote this row. A return and a settlement are
   * both negative, so the sign cannot carry it -- see
   * {@link ConsumptionChangeKind}.
   */
  @Column({ type: 'varchar' })
  @Index()
  kind!: ConsumptionChangeKind;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @OneToOne('orders')
  @JoinColumn({ name: 'id', referencedColumnName: 'id' })
  order!: OrderEntity;

  @ManyToOne(
    'consumption_order_items',
    (item: ConsumptionOrderItemEntityClass) => item.changes,
  )
  @JoinColumn({ name: 'itemId', referencedColumnName: 'id' })
  item!: ConsumptionOrderItemEntityClass;
}
