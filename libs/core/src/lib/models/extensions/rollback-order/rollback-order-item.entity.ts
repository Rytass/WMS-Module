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
import { type RollbackOrderEntityClass } from './rollback-order.entity';

export const RollbackOrderItemEntity = Symbol('RollbackOrderItemEntity');

/**
 * 沖銷單項目 — 一個 item 沖銷一顆事件（orders registry 的一列）。
 *
 * targetOrderId = 被沖銷的事件（unique：一顆事件最多被沖銷一次，DB 層防雙重沖銷）。
 * reverseOrderId = 反向事件（本次沖銷寫入的 negated change / stocks 掛的 orders id）。
 * targetKind = 事件的 change 所屬單據類別（審計/SAP 沖銷參數解析用）。
 */
@Entity('rollback_order_items')
export class RollbackOrderItemEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  orderId!: string;

  @Column({ type: 'uuid', unique: true })
  targetOrderId!: string;

  @Column({ type: 'uuid', unique: true })
  reverseOrderId!: string;

  @Column({ type: 'varchar', nullable: true })
  targetKind!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(
    'rollback_orders',
    (order: RollbackOrderEntityClass) => order.items,
  )
  @JoinColumn({ name: 'orderId', referencedColumnName: 'id' })
  order!: RollbackOrderEntityClass;

  @OneToOne('orders')
  @JoinColumn({ name: 'targetOrderId', referencedColumnName: 'id' })
  targetOrder!: OrderEntity;

  @OneToOne('orders')
  @JoinColumn({ name: 'reverseOrderId', referencedColumnName: 'id' })
  reverseOrder!: OrderEntity;
}
