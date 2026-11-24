import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TransferChangeKind } from '../../../constants/transfer-change-kind';
import { TransferOrderItemEntityClass } from './transfer-order-item.entity';
import { numericColumnTransformer } from '../../numeric-column.transformer';

export const TransferOrderChangeEntity = Symbol('TransferOrderChangeEntity');
@Entity('transfer_order_changes')
export class TransferOrderChangeEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  itemId!: string;

  @Column({ type: 'numeric', transformer: numericColumnTransformer })
  quantityChanged!: number;

  /**
   * Which of the three actions wrote this row. An execution and a cancel are
   * both negative, so the sign cannot carry it -- see {@link TransferChangeKind}.
   *
   * Nullable only so a table that already holds rows can gain the column; the
   * integration guide's upgrade SQL fills it. Every write sets it.
   */
  @Column({ type: 'varchar', nullable: true })
  kind!: TransferChangeKind | null;

  @OneToOne('orders')
  @JoinColumn({ name: 'id', referencedColumnName: 'id' })
  order!: OrderEntity;

  @ManyToOne(
    'transfer_order_items',
    (item: TransferOrderItemEntityClass) => item.changes,
  )
  @JoinColumn({ name: 'itemId', referencedColumnName: 'id' })
  item!: TransferOrderItemEntityClass;
}
